const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'gacha.db');
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// sql.js → better-sqlite3 호환 래퍼
// 나머지 코드가 db.prepare(...).get(), .all(), .run() 그대로 쓸 수 있게
class DatabaseWrapper {
  constructor(sqlDb, dbPath) {
    this._db = sqlDb;
    this._dbPath = dbPath;
    this._saveTimer = null;
  }

  _scheduleSave() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this._saveToDisk();
    }, 100);
  }

  _saveToDisk() {
    try {
      const data = this._db.export();
      fs.writeFileSync(this._dbPath, Buffer.from(data));
    } catch (e) {
      console.error('[DB] Save error:', e.message);
    }
  }

  _saveSync() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
    }
    this._saveToDisk();
  }

  prepare(sql) {
    const self = this;
    return {
      get(...params) {
        try {
          const stmt = self._db.prepare(sql);
          if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])) {
            stmt.bind(self._convertNamedParams(sql, params[0]));
          } else if (params.length > 0) {
            stmt.bind(params);
          }
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            stmt.free();
            const row = {};
            cols.forEach((c, i) => row[c] = vals[i]);
            return row;
          }
          stmt.free();
          return undefined;
        } catch (e) {
          // If it's a write statement that was accidentally called with get
          if (sql.trim().toUpperCase().startsWith('UPDATE') ||
              sql.trim().toUpperCase().startsWith('INSERT') ||
              sql.trim().toUpperCase().startsWith('DELETE')) {
            return self._runInternal(sql, params);
          }
          throw e;
        }
      },

      all(...params) {
        const stmt = self._db.prepare(sql);
        if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])) {
          stmt.bind(self._convertNamedParams(sql, params[0]));
        } else if (params.length > 0) {
          stmt.bind(params);
        }
        const results = [];
        while (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          const row = {};
          cols.forEach((c, i) => row[c] = vals[i]);
          results.push(row);
        }
        stmt.free();
        return results;
      },

      run(...params) {
        return self._runInternal(sql, params);
      }
    };
  }

  _runInternal(sql, params) {
    if (params.length === 1 && typeof params[0] === 'object' && !Array.isArray(params[0])) {
      this._db.run(sql, this._convertNamedParams(sql, params[0]));
    } else if (params.length > 0) {
      this._db.run(sql, params);
    } else {
      this._db.run(sql);
    }
    this._scheduleSave();

    // better-sqlite3 호환: run()은 { changes, lastInsertRowid } 반환
    const changes = this._db.getRowsModified();
    // lastInsertRowid
    let lastInsertRowid = 0;
    try {
      const r = this._db.exec('SELECT last_insert_rowid() as id');
      if (r.length > 0 && r[0].values.length > 0) {
        lastInsertRowid = r[0].values[0][0];
      }
    } catch (e) {}

    return { changes, lastInsertRowid };
  }

  // @param 형식을 ? 형식으로 변환
  _convertNamedParams(sql, obj) {
    // sql.js는 $name, :name, @name 형태의 named params 지원
    // better-sqlite3는 @name 형태 사용
    // sql.js에서는 object로 바인딩 가능
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      result[':' + key] = val;
      result['@' + key] = val;
      result['$' + key] = val;
    }
    return result;
  }

  exec(sql) {
    this._db.exec(sql);
    this._scheduleSave();
  }

  pragma(str) {
    try {
      this._db.exec(`PRAGMA ${str}`);
    } catch (e) {
      // some pragmas may not work with sql.js, that's OK
    }
  }

  transaction(fn) {
    const self = this;
    return function (...args) {
      self._db.exec('BEGIN TRANSACTION');
      try {
        const result = fn(...args);
        self._db.exec('COMMIT');
        self._saveSync();
        return result;
      } catch (e) {
        self._db.exec('ROLLBACK');
        throw e;
      }
    };
  }

  close() {
    this._saveSync();
    this._db.close();
  }
}

// 동기적 초기화를 위한 전역 DB
let db = null;

function getDb() {
  if (db) return db;
  throw new Error('Database not initialized. Call initDb() first.');
}

// Proxy로 래핑해서 db.prepare() 등 직접 호출 가능하게
const _extraExports = {};
const dbProxy = new Proxy({}, {
  get(target, prop) {
    // initDb 등 추가 export는 DB 초기화 전에도 접근 가능해야 함
    if (prop in _extraExports) return _extraExports[prop];
    const realDb = getDb();
    if (typeof realDb[prop] === 'function') {
      return realDb[prop].bind(realDb);
    }
    return realDb[prop];
  },
  set(target, prop, value) {
    _extraExports[prop] = value;
    return true;
  }
});

async function initDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    sqlDb = new SQL.Database(buffer);
  } else {
    sqlDb = new SQL.Database();
  }

  db = new DatabaseWrapper(sqlDb, DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // ============ 테이블 생성 ============
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      currency INTEGER DEFAULT 1000,
      gold INTEGER DEFAULT 5000,
      stamina INTEGER DEFAULT 120,
      stamina_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_pulls INTEGER DEFAULT 0,
      pity_counter INTEGER DEFAULT 0,
      last_login_date TEXT DEFAULT '',
      login_streak INTEGER DEFAULT 0,
      representative_inventory_id INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      rarity TEXT NOT NULL,
      element TEXT DEFAULT 'neutral',
      title TEXT DEFAULT '',
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      image_bust TEXT DEFAULT '',
      image_sd TEXT DEFAULT '',
      image_ld TEXT DEFAULT '',
      quote TEXT DEFAULT '',
      base_hp INTEGER DEFAULT 1000,
      base_atk INTEGER DEFAULT 100,
      base_def INTEGER DEFAULT 80,
      base_spd INTEGER DEFAULT 100,
      turn_notes INTEGER DEFAULT 4,
      origin TEXT DEFAULT 'force',
      is_limited INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      type TEXT NOT NULL CHECK(type IN ('attack','defense','ultimate','heal','buff','debuff','support')),
      rarity TEXT DEFAULT 'faint',
      cost INTEGER DEFAULT 1,
      power REAL DEFAULT 1.0,
      element TEXT DEFAULT 'neutral',
      target TEXT DEFAULT 'single',
      defense_mult REAL DEFAULT 0.0,
      cooldown INTEGER DEFAULT 0,
      extra TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS character_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      is_default INTEGER DEFAULT 0,
      is_fixed INTEGER DEFAULT 0,
      FOREIGN KEY (character_id) REFERENCES characters(id),
      FOREIGN KEY (skill_id) REFERENCES skills(id),
      UNIQUE(character_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS skill_inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      obtained_from TEXT DEFAULT 'gacha',
      obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (skill_id) REFERENCES skills(id)
    );

    CREATE TABLE IF NOT EXISTS equipped_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inventory_id INTEGER NOT NULL,
      skill_inventory_id INTEGER,
      skill_id INTEGER NOT NULL,
      slot_type TEXT DEFAULT 'attack',
      slot_number INTEGER NOT NULL,
      is_fixed INTEGER DEFAULT 0,
      FOREIGN KEY (inventory_id) REFERENCES inventory(id),
      FOREIGN KEY (skill_inventory_id) REFERENCES skill_inventory(id),
      FOREIGN KEY (skill_id) REFERENCES skills(id),
      UNIQUE(inventory_id, slot_type, slot_number)
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      character_id INTEGER NOT NULL,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      awakening INTEGER DEFAULT 0,
      obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_new INTEGER DEFAULT 1,
      is_favorite INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      offer_inventory_id INTEGER NOT NULL,
      want_inventory_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','cancelled')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id),
      FOREIGN KEY (offer_inventory_id) REFERENCES inventory(id),
      FOREIGN KEY (want_inventory_id) REFERENCES inventory(id)
    );

    CREATE TABLE IF NOT EXISTS pull_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      character_id INTEGER NOT NULL,
      rarity TEXT NOT NULL,
      pulled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE IF NOT EXISTS stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter INTEGER NOT NULL,
      stage_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      difficulty TEXT DEFAULT 'normal',
      stamina_cost INTEGER DEFAULT 6,
      enemy_data TEXT NOT NULL,
      rewards TEXT NOT NULL,
      recommended_level INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS stage_clears (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      stage_id INTEGER NOT NULL,
      stars INTEGER DEFAULT 0,
      best_turns INTEGER,
      cleared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (stage_id) REFERENCES stages(id),
      UNIQUE(user_id, stage_id)
    );

    CREATE TABLE IF NOT EXISTS raids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      element TEXT NOT NULL,
      max_hp INTEGER NOT NULL,
      current_hp INTEGER NOT NULL,
      base_atk INTEGER DEFAULT 200,
      base_def INTEGER DEFAULT 100,
      base_spd INTEGER DEFAULT 90,
      turn_notes INTEGER DEFAULT 6,
      attack_pattern TEXT NOT NULL,
      rewards TEXT NOT NULL,
      starts_at DATETIME NOT NULL,
      ends_at DATETIME NOT NULL,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS raid_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raid_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      damage_dealt INTEGER NOT NULL,
      turns_used INTEGER NOT NULL,
      entered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (raid_id) REFERENCES raids(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS daily_missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      mission_type TEXT NOT NULL,
      target_count INTEGER NOT NULL,
      current_count INTEGER DEFAULT 0,
      reward_type TEXT NOT NULL,
      reward_amount INTEGER NOT NULL,
      is_completed INTEGER DEFAULT 0,
      is_claimed INTEGER DEFAULT 0,
      date TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS mail (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER DEFAULT NULL,
      recipient_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      rewards TEXT DEFAULT NULL,
      is_read INTEGER DEFAULT 0,
      is_claimed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME DEFAULT NULL,
      FOREIGN KEY (sender_id) REFERENCES users(id),
      FOREIGN KEY (recipient_id) REFERENCES users(id)
    );
  `);

  // ============ 마이그레이션 ============
  // origin 컬럼이 없으면 추가
  try {
    db.prepare("SELECT origin FROM characters LIMIT 1").get();
  } catch (e) {
    db.exec("ALTER TABLE characters ADD COLUMN origin TEXT DEFAULT 'force'");
    console.log('[DB] origin 컬럼 추가 완료');
  }
  // skills.rarity 컬럼
  try {
    db.prepare("SELECT rarity FROM skills LIMIT 1").get();
  } catch (e) {
    db.exec("ALTER TABLE skills ADD COLUMN rarity TEXT DEFAULT 'faint'");
    console.log('[DB] skills.rarity 컬럼 추가 완료');
  }
  // character_skills.is_fixed 컬럼
  try {
    db.prepare("SELECT is_fixed FROM character_skills LIMIT 1").get();
  } catch (e) {
    db.exec("ALTER TABLE character_skills ADD COLUMN is_fixed INTEGER DEFAULT 0");
    console.log('[DB] character_skills.is_fixed 컬럼 추가 완료');
  }
  // skill_inventory 테이블
  db.exec(`CREATE TABLE IF NOT EXISTS skill_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    obtained_from TEXT DEFAULT 'gacha',
    obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (skill_id) REFERENCES skills(id)
  )`);
  // equipped_skills 마이그레이션 (slot_type, is_fixed, skill_inventory_id)
  try {
    db.prepare("SELECT slot_type FROM equipped_skills LIMIT 1").get();
  } catch (e) {
    db.exec("ALTER TABLE equipped_skills ADD COLUMN slot_type TEXT DEFAULT 'attack'");
    db.exec("ALTER TABLE equipped_skills ADD COLUMN is_fixed INTEGER DEFAULT 0");
    db.exec("ALTER TABLE equipped_skills ADD COLUMN skill_inventory_id INTEGER");
    console.log('[DB] equipped_skills 마이그레이션 완료');
  }

  // 이미지 타입 확장 마이그레이션
  try {
    db.prepare("SELECT image_bust FROM characters LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE characters ADD COLUMN image_bust TEXT DEFAULT ''");
    db.exec("ALTER TABLE characters ADD COLUMN image_sd TEXT DEFAULT ''");
    db.exec("ALTER TABLE characters ADD COLUMN image_ld TEXT DEFAULT ''");
    console.log('[DB] characters 이미지 타입 마이그레이션 완료');
  }

  // 대표 캐릭터 마이그레이션
  try {
    db.prepare("SELECT representative_inventory_id FROM users LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE users ADD COLUMN representative_inventory_id INTEGER DEFAULT NULL");
    console.log('[DB] users 대표캐릭터 마이그레이션 완료');
  }

  // 프로필 마이그레이션 (bio, profile_icon)
  try {
    db.prepare("SELECT bio FROM users LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''");
    db.exec("ALTER TABLE users ADD COLUMN profile_icon TEXT DEFAULT ''");
    console.log('[DB] users 프로필 마이그레이션 완료');
  }

  // ============ 캐릭터 시드 ============
  const charCount = db.prepare('SELECT COUNT(*) as cnt FROM characters').get();
  if (charCount.cnt === 0) {
    const seed = [
      // SSR (2)
      { name: '유카리', rarity: 'SSR', element: 'fire', origin: 'life', title: '영원한 황혼의 왕', description: '먼 옛날부터 살아온 황혼의 왕', quote: '에반데.', base_hp: 5500, base_atk: 280, base_def: 180, base_spd: 115, turn_notes: 6, image_url: '/uploads/characters/char_1.png' },
      { name: '츠바키', rarity: 'SSR', element: 'light', origin: 'season', title: '분홍 동백의 신중', description: '분홍 동백의 신중', quote: '이 길이 아니었나...', base_hp: 4800, base_atk: 310, base_def: 150, base_spd: 130, turn_notes: 6, image_url: '/uploads/characters/char_2.png' },
      // SR (4)
      { name: '시스투스', rarity: 'SR', element: 'wind', origin: 'memory', title: '물들어가는 무채', description: '성영의 관리자의 세계에서 온 유일한 생존자. 의식성 에스페리아의 대무녀.', quote: '"사라지고 싶지 않아"', base_hp: 80, base_atk: 15, base_def: 10, base_spd: 14, turn_notes: 8, image_url: '/uploads/characters/char_3.png' },
      { name: '베르트랑', rarity: 'SR', element: 'fire', origin: 'life', title: '파프니르', description: '파프니르의 기사.', quote: '아저씨는 이런 게 익숙치 않아서 말이야.', base_hp: 4800, base_atk: 190, base_def: 200, base_spd: 95, turn_notes: 5, image_url: '/uploads/characters/char_4.png' },
      { name: '아우라', rarity: 'SR', element: 'light', origin: 'sound', title: '기도하는 자', description: '새벽기사단의 2분대 대장.', quote: '이른 새벽을 기다리며.', base_hp: 4500, base_atk: 250, base_def: 130, base_spd: 105, turn_notes: 5, image_url: '/uploads/characters/char_5.png' },
      { name: '카날리', rarity: 'SR', element: 'water', origin: 'force', title: '싱크로스트', description: '다른 세계에서 온 대행관리자.', quote: '가라앉아.', base_hp: 5000, base_atk: 170, base_def: 180, base_spd: 100, turn_notes: 5, image_url: '/uploads/characters/char_6.png' },
      // R (6)
      { name: '코루리', rarity: 'R', element: 'light', origin: 'time', title: '용안의 소녀', description: '용화의 비술을 간직한 소녀.', quote: '이 쪽 보지 마.', base_hp: 3500, base_atk: 200, base_def: 110, base_spd: 115, turn_notes: 4, image_url: '/uploads/characters/char_7.png' },
      { name: '리카', rarity: 'R', element: 'water', origin: 'space', title: '수호하는 자', description: '쿨뢰르 레기온의 큰언니.', quote: '마노의 혼, 물러서지 않는다.', base_hp: 3800, base_atk: 180, base_def: 140, base_spd: 95, turn_notes: 4, image_url: '/uploads/characters/char_8.png' },
      { name: '린네', rarity: 'R', element: 'wind', origin: 'memory', title: '사라진 그리움', description: '린네 할로우패스.', quote: '마치 선향불꽃처럼.', base_hp: 4000, base_atk: 210, base_def: 150, base_spd: 90, turn_notes: 4, image_url: '/uploads/characters/char_9.png' },
      { name: '페리도트', rarity: 'R', element: 'dark', origin: 'intellect', title: '사라져 버린 긍지', description: '먼 옛날의 대마법사.', quote: '저를 내버려두세요.', base_hp: 3600, base_atk: 190, base_def: 120, base_spd: 105, turn_notes: 4, image_url: '/uploads/characters/char_10.png' },
      { name: '렌', rarity: 'R', element: 'wind', origin: 'life', title: '매와 함께하는 기사', description: '새벽기사단 2분대의 정령사.', quote: '지금 바로 그대에게 전하고파 뛰쳐나갔어.', base_hp: 3400, base_atk: 220, base_def: 100, base_spd: 100, turn_notes: 4, image_url: '/uploads/characters/char_11.png' },
      { name: '게로트', rarity: 'R', element: 'wind', origin: 'heart', title: '요리의 대가', description: '에스큘럼의 요리 마스터.', quote: '가장 중요한 것은 상대를 생각하는 마음.', base_hp: 3700, base_atk: 175, base_def: 130, base_spd: 110, turn_notes: 4, image_url: '/uploads/characters/char_12.png' },
      // N (9)
      { name: '쿼시', rarity: 'N', element: 'light', origin: 'sound', title: '비트마스터', description: '유니아나의 비트마스터 중 하나', quote: '이 곡 좋은데?', base_hp: 2800, base_atk: 140, base_def: 100, base_spd: 95, turn_notes: 3, image_url: '/uploads/characters/char_13.png' },
      { name: '가네트', rarity: 'N', element: 'fire', origin: 'time', title: '회귀의 기사', description: '에스큘럼 새벽기사단의 창끝 분대 분대원.', quote: '이 익숙함은?', base_hp: 3200, base_atk: 120, base_def: 120, base_spd: 80, turn_notes: 3, image_url: '/uploads/characters/char_14.png' },
      { name: '호프', rarity: 'N', element: 'wind', origin: 'life', title: '느긋한 집배원', description: '에스큘럼의 느릿한 집배원.', quote: '"다음 집으로..."', base_hp: 3000, base_atk: 150, base_def: 90, base_spd: 100, turn_notes: 3, image_url: '/uploads/characters/char_15.png' },
      { name: '메이', rarity: 'N', element: 'dark', origin: 'intellect', title: '에너지학 연구원', description: '스타기어의 에너지 연구원.', quote: '"발견!"', base_hp: 2600, base_atk: 130, base_def: 90, base_spd: 120, turn_notes: 3, image_url: '/uploads/characters/char_16.png' },
      { name: '티어리', rarity: 'N', element: 'wind', origin: 'force', title: '교육팀 팀장', description: '신기루 교육지원팀의 팀장.', quote: '"이 보고서 누가 썼어?"', base_hp: 3500, base_atk: 110, base_def: 140, base_spd: 70, turn_notes: 3, image_url: '/uploads/characters/char_17.png' },
      { name: '밥', rarity: 'N', element: 'fire', origin: 'memory', title: '평범한? 농부', description: '', quote: '"야채라도 가져가라."', base_hp: 2700, base_atk: 160, base_def: 85, base_spd: 110, turn_notes: 3, image_url: '/uploads/characters/char_18.png' },
      { name: '아이유브', rarity: 'N', element: 'fire', origin: 'season', title: '불행한 자', description: '미스테리아의 ', quote: '"내가 받는 벌이라고...?"', base_hp: 80, base_atk: 145, base_def: 95, base_spd: 95, turn_notes: 3, image_url: '/uploads/characters/char_19.png' },
      { name: '리사', rarity: 'N', element: 'light', origin: 'sound', title: '집사 중의 집사', description: '호기심 가득한 천사 견습 모험가.', quote: '"이 지도가 향하는 곳은!"', base_hp: 60, base_atk: 7, base_def: 5, base_spd: 8, turn_notes: 6, image_url: '/uploads/characters/char_20.png' },
      { name: '아르시스', rarity: 'N', element: 'water', origin: 'heart', title: '성취자 멘토', description: '세인트 인퀴지터의 선배 성취자.', quote: '쨘! 이게 기적이라는 거야.', base_hp: 1000, base_atk: 100, base_def: 80, base_spd: 100, turn_notes: 4, image_url: '/uploads/characters/char_21.png' },
    ];

    const cols = ['name','rarity','element','origin','title','description','quote','base_hp','base_atk','base_def','base_spd','turn_notes','image_url'];
    for (const c of seed) {
      const vals = cols.map(k => c[k]);
      const placeholders = cols.map(() => '?').join(', ');
      db.prepare(`INSERT INTO characters (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);
    }
    console.log(`[DB] ${seed.length}개 캐릭터 시드 완료`);
  }

  // ============ 스킬 시드 ============
  const skillCount = db.prepare('SELECT COUNT(*) as cnt FROM skills').get();
  if (skillCount.cnt === 0) {
    const skillSeed = [
      // 기본 스킬 (흐림)
      { name: '기본 타격', description: '적 하나에게 기본 피해', type: 'attack', rarity: 'faint', cost: 1, power: 1.0, element: 'neutral', target: 'single', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '기본 방어', description: '받는 피해 40% 감소', type: 'defense', rarity: 'faint', cost: 1, power: 0, element: 'neutral', target: 'self', defense_mult: 0.4, cooldown: 0, extra: '{}' },
      // 일반 공격 (담)
      { name: '강타', description: '적 하나에게 강한 피해', type: 'attack', rarity: 'pale', cost: 2, power: 1.8, element: 'neutral', target: 'single', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '전체 강타', description: '적 전체에게 피해', type: 'attack', rarity: 'pale', cost: 3, power: 1.5, element: 'neutral', target: 'aoe', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '화염 베기', description: '불속성 단일 공격', type: 'attack', rarity: 'pale', cost: 2, power: 1.9, element: 'fire', target: 'single', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '화염 폭풍', description: '불속성 전체 공격', type: 'attack', rarity: 'pale', cost: 3, power: 1.6, element: 'fire', target: 'aoe', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '수류탄', description: '물속성 단일 공격', type: 'attack', rarity: 'pale', cost: 2, power: 1.9, element: 'water', target: 'single', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '해일', description: '물속성 전체 공격', type: 'attack', rarity: 'pale', cost: 3, power: 1.6, element: 'water', target: 'aoe', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '덩굴 채찍', description: '풍속성 단일 공격', type: 'attack', rarity: 'pale', cost: 2, power: 1.9, element: 'wind', target: 'single', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '가시 폭발', description: '풍속성 전체 공격', type: 'attack', rarity: 'pale', cost: 3, power: 1.6, element: 'wind', target: 'aoe', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '빛의 창', description: '빛속성 단일 공격', type: 'attack', rarity: 'pale', cost: 2, power: 1.9, element: 'light', target: 'single', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '심판의 빛', description: '빛속성 전체 공격', type: 'attack', rarity: 'pale', cost: 3, power: 1.6, element: 'light', target: 'aoe', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '어둠의 칼날', description: '암속성 단일 공격', type: 'attack', rarity: 'pale', cost: 2, power: 1.9, element: 'dark', target: 'single', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '암흑 폭발', description: '암속성 전체 공격', type: 'attack', rarity: 'pale', cost: 3, power: 1.6, element: 'dark', target: 'aoe', defense_mult: 0, cooldown: 0, extra: '{}' },
      // 강화 공격 (짙음)
      { name: '맹렬한 일격', description: '적 하나에게 큰 피해', type: 'attack', rarity: 'deep', cost: 3, power: 2.8, element: 'neutral', target: 'single', defense_mult: 0, cooldown: 0, extra: '{}' },
      // 방어 (담~짙음)
      { name: '강화 방어', description: '받는 피해 60% 감소', type: 'defense', rarity: 'pale', cost: 2, power: 0, element: 'neutral', target: 'self', defense_mult: 0.6, cooldown: 0, extra: '{}' },
      { name: '완벽한 방어', description: '받는 피해 80% 감소', type: 'defense', rarity: 'deep', cost: 3, power: 0, element: 'neutral', target: 'self', defense_mult: 0.8, cooldown: 0, extra: '{}' },
      { name: '반격 방어', description: '피해 50% 감소 + 반격', type: 'defense', rarity: 'deep', cost: 2, power: 0.5, element: 'neutral', target: 'self', defense_mult: 0.5, cooldown: 0, extra: '{"counter":true}' },
      { name: '보호막', description: '아군 하나 피해 50% 감소', type: 'defense', rarity: 'pale', cost: 2, power: 0, element: 'neutral', target: 'ally_single', defense_mult: 0.5, cooldown: 0, extra: '{}' },
      // 궁극기 (짙음~영롱) - 캐릭터 고유기들
      { name: '황혼의 불꽃', description: '적 전체 ATK 400% + 아군 ATK 버프', type: 'ultimate', rarity: 'iridescent', cost: 5, power: 4.0, element: 'fire', target: 'aoe', defense_mult: 0, cooldown: 0, extra: '{"buff":{"stat":"atk","amount":0.3,"turns":2}}' },
      { name: '벚꽃 난무', description: '적 전체 ATK 380% 피해', type: 'ultimate', rarity: 'iridescent', cost: 5, power: 3.8, element: 'light', target: 'aoe', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '무채의 꿈', description: '적 전체 ATK 350% 피해', type: 'ultimate', rarity: 'deep', cost: 4, power: 3.5, element: 'wind', target: 'aoe', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '파프니르의 화염', description: '적 하나 ATK 450% 피해', type: 'ultimate', rarity: 'deep', cost: 4, power: 4.5, element: 'fire', target: 'single', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '새벽의 기도', description: '아군 전체 HP 40% 회복 + ATK 버프', type: 'ultimate', rarity: 'deep', cost: 4, power: 0.4, element: 'light', target: 'ally_all', defense_mult: 0, cooldown: 0, extra: '{"heal":true,"buff":{"stat":"atk","amount":0.2,"turns":2}}' },
      { name: '심연의 조율', description: '아군 전체 HP 40% 회복', type: 'ultimate', rarity: 'deep', cost: 4, power: 0.4, element: 'water', target: 'ally_all', defense_mult: 0, cooldown: 0, extra: '{"heal":true}' },
      { name: '용안 해방', description: '적 전체 ATK 300% 피해', type: 'ultimate', rarity: 'deep', cost: 4, power: 3.0, element: 'light', target: 'aoe', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '마노의 방패', description: '적 전체 ATK 280% + 아군 DEF 버프', type: 'ultimate', rarity: 'deep', cost: 4, power: 2.8, element: 'water', target: 'aoe', defense_mult: 0, cooldown: 0, extra: '{"buff":{"stat":"def","amount":0.3,"turns":2}}' },
      { name: '선향불꽃', description: '적 하나 ATK 350% 피해', type: 'ultimate', rarity: 'deep', cost: 3, power: 3.5, element: 'wind', target: 'single', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '잊혀진 마도', description: '적 하나 ATK 400% (DEF 무시)', type: 'ultimate', rarity: 'deep', cost: 4, power: 4.0, element: 'dark', target: 'single', defense_mult: 0, cooldown: 0, extra: '{"ignoreDef":true}' },
      { name: '정령의 날개', description: '적 전체 ATK 280% 피해', type: 'ultimate', rarity: 'deep', cost: 3, power: 2.8, element: 'wind', target: 'aoe', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '미식의 심장', description: '적 전체 300% + 아군 HP 회복', type: 'ultimate', rarity: 'deep', cost: 4, power: 3.0, element: 'wind', target: 'aoe', defense_mult: 0, cooldown: 0, extra: '{"alsoHeal":0.2}' },
      // 회복/버프/디버프 (담~짙음)
      { name: '응급 치료', description: '아군 하나 HP 25% 회복', type: 'heal', rarity: 'pale', cost: 2, power: 0.25, element: 'neutral', target: 'ally_single', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '전체 치유', description: '아군 전체 HP 15% 회복', type: 'heal', rarity: 'deep', cost: 3, power: 0.15, element: 'neutral', target: 'ally_all', defense_mult: 0, cooldown: 0, extra: '{}' },
      { name: '전투 고무', description: '아군 하나 ATK 30% 증가(3턴)', type: 'buff', rarity: 'pale', cost: 2, power: 0.3, element: 'neutral', target: 'ally_single', defense_mult: 0, cooldown: 0, extra: '{"stat":"atk","turns":3}' },
      { name: '철벽 강화', description: '아군 하나 DEF 30% 증가(3턴)', type: 'buff', rarity: 'pale', cost: 2, power: 0.3, element: 'neutral', target: 'ally_single', defense_mult: 0, cooldown: 0, extra: '{"stat":"def","turns":3}' },
      { name: '약점 간파', description: '적 하나 DEF 25% 감소(3턴)', type: 'debuff', rarity: 'pale', cost: 2, power: 0.25, element: 'neutral', target: 'single', defense_mult: 0, cooldown: 0, extra: '{"stat":"def","turns":3}' },
      { name: '속도 저하', description: '적 하나 SPD 25% 감소(3턴)', type: 'debuff', rarity: 'pale', cost: 2, power: 0.25, element: 'neutral', target: 'single', defense_mult: 0, cooldown: 0, extra: '{"stat":"spd","turns":3}' },
    ];

    const sCols = ['name','description','type','rarity','cost','power','element','target','defense_mult','cooldown','extra'];
    for (const s of skillSeed) {
      const vals = sCols.map(k => s[k]);
      const placeholders = sCols.map(() => '?').join(', ');
      db.prepare(`INSERT INTO skills (${sCols.join(', ')}) VALUES (${placeholders})`).run(...vals);
    }
    console.log(`[DB] ${skillSeed.length}개 스킬 시드 완료`);

    // 캐릭터-스킬 매핑
    const getSkillId = (name) => db.prepare('SELECT id FROM skills WHERE name = ?').get(name)?.id;
    const getCharId = (name) => db.prepare('SELECT id FROM characters WHERE name = ?').get(name)?.id;

    const charSkillMap = [
      // SSR
      { char: '유카리', skills: ['기본 타격','강타','전체 강타','화염 베기','화염 폭풍','기본 방어','강화 방어','황혼의 불꽃'], defaults: ['기본 타격','강타','화염 베기','기본 방어','황혼의 불꽃'] },
      { char: '츠바키', skills: ['기본 타격','강타','맹렬한 일격','빛의 창','심판의 빛','기본 방어','반격 방어','벚꽃 난무'], defaults: ['기본 타격','맹렬한 일격','빛의 창','기본 방어','벚꽃 난무'] },
      // SR
      { char: '시스투스', skills: ['기본 타격','덩굴 채찍','가시 폭발','기본 방어','강화 방어','응급 치료','전체 치유','무채의 꿈'], defaults: ['기본 타격','덩굴 채찍','기본 방어','응급 치료','무채의 꿈'] },
      { char: '베르트랑', skills: ['기본 타격','강타','화염 베기','기본 방어','강화 방어','반격 방어','파프니르의 화염'], defaults: ['기본 타격','강타','기본 방어','반격 방어','파프니르의 화염'] },
      { char: '아우라', skills: ['기본 타격','빛의 창','기본 방어','응급 치료','전체 치유','전투 고무','새벽의 기도'], defaults: ['기본 타격','빛의 창','기본 방어','응급 치료','새벽의 기도'] },
      { char: '카날리', skills: ['기본 타격','수류탄','해일','기본 방어','강화 방어','보호막','심연의 조율'], defaults: ['기본 타격','수류탄','기본 방어','보호막','심연의 조율'] },
      // R
      { char: '코루리', skills: ['기본 타격','빛의 창','기본 방어','전투 고무','용안 해방'], defaults: ['기본 타격','빛의 창','기본 방어','전투 고무','용안 해방'] },
      { char: '리카', skills: ['기본 타격','수류탄','기본 방어','강화 방어','철벽 강화','마노의 방패'], defaults: ['기본 타격','수류탄','기본 방어','강화 방어','마노의 방패'] },
      { char: '린네', skills: ['기본 타격','강타','덩굴 채찍','기본 방어','선향불꽃'], defaults: ['기본 타격','강타','덩굴 채찍','기본 방어','선향불꽃'] },
      { char: '페리도트', skills: ['기본 타격','어둠의 칼날','암흑 폭발','기본 방어','약점 간파','잊혀진 마도'], defaults: ['기본 타격','어둠의 칼날','기본 방어','약점 간파','잊혀진 마도'] },
      { char: '렌', skills: ['기본 타격','덩굴 채찍','가시 폭발','기본 방어','속도 저하','정령의 날개'], defaults: ['기본 타격','덩굴 채찍','기본 방어','속도 저하','정령의 날개'] },
      { char: '게로트', skills: ['기본 타격','덩굴 채찍','기본 방어','응급 치료','전투 고무','미식의 심장'], defaults: ['기본 타격','덩굴 채찍','기본 방어','응급 치료','미식의 심장'] },
      // N (궁극기 없음)
      { char: '쿼시', skills: ['기본 타격','빛의 창','기본 방어','전투 고무'], defaults: ['기본 타격','빛의 창','기본 방어','전투 고무'] },
      { char: '가네트', skills: ['기본 타격','화염 베기','기본 방어','강화 방어'], defaults: ['기본 타격','화염 베기','기본 방어','강화 방어'] },
      { char: '호프', skills: ['기본 타격','덩굴 채찍','기본 방어','응급 치료'], defaults: ['기본 타격','덩굴 채찍','기본 방어'] },
      { char: '메이', skills: ['기본 타격','어둠의 칼날','기본 방어','약점 간파'], defaults: ['기본 타격','어둠의 칼날','기본 방어'] },
      { char: '티어리', skills: ['기본 타격','덩굴 채찍','기본 방어','강화 방어','철벽 강화'], defaults: ['기본 타격','덩굴 채찍','기본 방어','강화 방어'] },
      { char: '밥', skills: ['기본 타격','화염 베기','기본 방어'], defaults: ['기본 타격','화염 베기','기본 방어'] },
      { char: '아이유브', skills: ['기본 타격','화염 베기','기본 방어','속도 저하'], defaults: ['기본 타격','화염 베기','기본 방어'] },
      { char: '리사', skills: ['기본 타격','빛의 창','기본 방어','응급 치료'], defaults: ['기본 타격','빛의 창','기본 방어','응급 치료'] },
      { char: '아르시스', skills: ['기본 타격','수류탄','기본 방어','응급 치료'], defaults: ['기본 타격','수류탄','기본 방어','응급 치료'] },
    ];

    // 고유기(ultimate) 스킬은 is_fixed = 1 (장착 해제 불가)
    const fixedSkillTypes = new Set(['ultimate']);
    for (const mapping of charSkillMap) {
      const charId = getCharId(mapping.char);
      if (!charId) continue;
      for (const skillName of mapping.skills) {
        const skillId = getSkillId(skillName);
        if (!skillId) continue;
        const isDefault = mapping.defaults.includes(skillName) ? 1 : 0;
        const skill = skillSeed.find(s => s.name === skillName);
        const isFixed = (skill && fixedSkillTypes.has(skill.type)) ? 1 : 0;
        try {
          db.prepare('INSERT OR IGNORE INTO character_skills (character_id, skill_id, is_default, is_fixed) VALUES (?, ?, ?, ?)').run(charId, skillId, isDefault, isFixed);
        } catch (e) {}
      }
    }
    console.log('[DB] 캐릭터-스킬 매핑 완료');
  }

  // ============ 스테이지 시드 ============
  const stageCount = db.prepare('SELECT COUNT(*) as cnt FROM stages').get();
  if (stageCount.cnt === 0) {
    const elements = ['fire','water','wind','dark','light'];
    const chapterNames = ['시작의 마을','어둠의 숲','불꽃의 산','심해 동굴','빛의 탑'];

    for (let ch = 1; ch <= 5; ch++) {
      for (let st = 1; st <= 8; st++) {
        const lvl = (ch - 1) * 8 + st;
        const enemyCount = st <= 3 ? 2 : st <= 6 ? 3 : 4;
        const isBoss = st === 8;
        const enemies = [];
        for (let e = 0; e < enemyCount; e++) {
          const eBoss = isBoss && e === enemyCount - 1;
          enemies.push({
                name: eBoss ? chapterNames[ch-1] + ' 보스' : '몬스터 Lv.' + lvl,
            element: elements[(ch - 1 + e) % 5],
            hp: Math.round((800 + lvl * 200) * (eBoss ? 3 : 1)),
            atk: Math.round(60 + lvl * 15 * (eBoss ? 1.5 : 1)),
            def: Math.round(40 + lvl * 8), spd: Math.round(70 + lvl * 3),
            turn_notes: eBoss ? 5 : 3, isBoss: eBoss,
            skills: eBoss
              ? [{ name: '기본 공격', type: 'attack', cost: 1, power: 1.0, target: 'single' }, { name: '강타', type: 'attack', cost: 2, power: 1.8, target: 'single' }, { name: '전체 공격', type: 'attack', cost: 3, power: 1.3, target: 'aoe' }, { name: '방어', type: 'defense', cost: 1, defense_mult: 0.5, target: 'self' }]
              : [{ name: '기본 공격', type: 'attack', cost: 1, power: 1.0, target: 'single' }, { name: '강타', type: 'attack', cost: 2, power: 1.5, target: 'single' }, { name: '방어', type: 'defense', cost: 1, defense_mult: 0.4, target: 'self' }]
          });
        }
        db.prepare('INSERT INTO stages (chapter, stage_number, name, difficulty, stamina_cost, recommended_level, enemy_data, rewards) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(ch, st, chapterNames[ch-1] + ' ' + st + (isBoss ? ' (보스)' : ''), 'normal', isBoss ? 10 : 6, lvl,
            JSON.stringify(enemies), JSON.stringify({ gold: 100 + lvl * 30, exp: 50 + lvl * 20, first_clear_diamond: isBoss ? 50 : 20 }));
      }
    }
    console.log('[DB] 40개 스테이지 시드 완료');
  }

  // ============ 레이드 시드 ============
  const raidCount = db.prepare('SELECT COUNT(*) as cnt FROM raids').get();
  if (raidCount.cnt === 0) {
    const now = new Date();
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
    db.prepare('INSERT INTO raids (name, element, max_hp, current_hp, base_atk, base_def, base_spd, turn_notes, attack_pattern, rewards, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('거대 슬라임 킹', 'water', 2000000, 2000000, 250, 120, 85, 6,
        JSON.stringify([
          { hp_threshold: 1.0, skills: [{ name: '기본 공격', type: 'attack', cost: 1, power: 1.2, target: 'single' }, { name: '전체 공격', type: 'attack', cost: 3, power: 1.0, target: 'aoe' }, { name: '방어', type: 'defense', cost: 2, defense_mult: 0.5, target: 'self' }] },
          { hp_threshold: 0.5, skills: [{ name: '강화 공격', type: 'attack', cost: 2, power: 2.0, target: 'single' }, { name: '전체 강타', type: 'attack', cost: 3, power: 1.5, target: 'aoe' }, { name: '방어', type: 'defense', cost: 2, defense_mult: 0.6, target: 'self' }] },
          { hp_threshold: 0.2, skills: [{ name: '폭주 공격', type: 'attack', cost: 2, power: 2.5, target: 'single' }, { name: '전체 폭주', type: 'attack', cost: 3, power: 2.0, target: 'aoe' }] }
          ]),
        JSON.stringify({ gold: 5000, diamond: 100, exp: 2000 }),
        now.toISOString(), weekEnd.toISOString());
    console.log('[DB] 레이드 시드 완료');
  }

  db._saveSync();
  console.log('[DB] 초기화 완료');
  return db;
}

module.exports = dbProxy;
module.exports.initDb = initDb;
