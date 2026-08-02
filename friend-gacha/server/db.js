const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'gacha.db');
const SEED_PATH = path.join(__dirname, '..', 'data', 'game_seed.json');
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
      extra TEXT DEFAULT '{}',
      obtainable INTEGER DEFAULT 1
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

  // 캐릭터 슬롯 수 마이그레이션
  try {
    db.prepare("SELECT attack_slots FROM characters LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE characters ADD COLUMN attack_slots INTEGER DEFAULT 3");
    db.exec("ALTER TABLE characters ADD COLUMN defense_slots INTEGER DEFAULT 2");
    console.log('[DB] characters 슬롯 수 마이그레이션 완료');
  }

  // 스킬 초기화 플래그 마이그레이션
  try {
    db.prepare("SELECT skills_initialized FROM inventory LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE inventory ADD COLUMN skills_initialized INTEGER DEFAULT 0");
    console.log('[DB] inventory skills_initialized 마이그레이션 완료');
  }

  // 특기(talent) 마이그레이션
  try {
    db.prepare("SELECT equipped_talent FROM inventory LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE inventory ADD COLUMN equipped_talent INTEGER DEFAULT 0");
    console.log('[DB] inventory equipped_talent 마이그레이션 완료');
  }

  // 잠금 마이그레이션
  try {
    db.prepare("SELECT is_locked FROM inventory LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE inventory ADD COLUMN is_locked INTEGER DEFAULT 0");
    console.log('[DB] inventory is_locked 마이그레이션 완료');
  }

  // 승급 마이그레이션
  try {
    db.prepare("SELECT promotion FROM inventory LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE inventory ADD COLUMN promotion INTEGER DEFAULT 0");
    console.log('[DB] inventory promotion 마이그레이션 완료');
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

  // 대표 캐릭터 character_id 기반으로 전환
  try {
    db.prepare("SELECT representative_character_id FROM users LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE users ADD COLUMN representative_character_id TEXT DEFAULT NULL");
    db.exec(`UPDATE users SET representative_character_id = (
      SELECT i.character_id FROM inventory i WHERE i.id = users.representative_inventory_id
    ) WHERE representative_inventory_id IS NOT NULL`);
    console.log('[DB] users 대표캐릭터 character_id 마이그레이션 완료');
  }

  // 프로필 마이그레이션 (bio, profile_icon)
  try {
    db.prepare("SELECT bio FROM users LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT ''");
    db.exec("ALTER TABLE users ADD COLUMN profile_icon TEXT DEFAULT ''");
    console.log('[DB] users 프로필 마이그레이션 완료');
  }

  // 튜토리얼 완료 플래그 마이그레이션
  try {
    db.prepare("SELECT tutorial_done FROM users LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE users ADD COLUMN tutorial_done INTEGER DEFAULT 0");
    db.exec("UPDATE users SET tutorial_done = 1");
    console.log('[DB] users.tutorial_done 마이그레이션 완료');
  }

  // tutorial_step 마이그레이션
  try {
    db.prepare("SELECT tutorial_step FROM users LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE users ADD COLUMN tutorial_step INTEGER DEFAULT 0");
    db.exec("UPDATE users SET tutorial_step = 999 WHERE tutorial_done = 1");
    console.log('[DB] users.tutorial_step 마이그레이션 완료');
  }

  // skills.equip_condition 마이그레이션
  try {
    db.prepare("SELECT equip_condition FROM skills LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE skills ADD COLUMN equip_condition TEXT DEFAULT '{}'");
    console.log('[DB] skills.equip_condition 마이그레이션 완료');
  }

  // skills.obtainable 마이그레이션
  try {
    db.prepare("SELECT obtainable FROM skills LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE skills ADD COLUMN obtainable INTEGER DEFAULT 1");
    console.log('[DB] skills.obtainable 마이그레이션 완료');
  }

  try {
    db.prepare("SELECT icon FROM skills LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE skills ADD COLUMN icon TEXT DEFAULT ''");
    console.log('[DB] skills.icon 마이그레이션 완료');
  }

  // character_skills.awakening_required 마이그레이션
  try {
    db.prepare("SELECT awakening_required FROM character_skills LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE character_skills ADD COLUMN awakening_required INTEGER DEFAULT -1");
    db.exec("UPDATE character_skills SET awakening_required = 0 WHERE is_default = 1");
    console.log('[DB] character_skills.awakening_required 마이그레이션 완료');
  }

  // stages.story_script 마이그레이션
  try {
    db.prepare("SELECT story_script FROM stages LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE stages ADD COLUMN story_script TEXT DEFAULT NULL");
    console.log('[DB] stages.story_script 마이그레이션 완료');
  }

  // stages.type 마이그레이션 (story / farming / event)
  try {
    db.prepare("SELECT type FROM stages LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE stages ADD COLUMN type TEXT DEFAULT 'story'");
    console.log('[DB] stages.type 마이그레이션 완료');
  }

  // stages 파밍/이벤트 필드 마이그레이션
  try {
    db.prepare("SELECT open_days FROM stages LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE stages ADD COLUMN open_days TEXT DEFAULT NULL");
    db.exec("ALTER TABLE stages ADD COLUMN always_open INTEGER DEFAULT 0");
    db.exec("ALTER TABLE stages ADD COLUMN unlock_condition TEXT DEFAULT NULL");
    db.exec("ALTER TABLE stages ADD COLUMN dungeon_group TEXT DEFAULT NULL");
    db.exec("ALTER TABLE stages ADD COLUMN description TEXT DEFAULT NULL");
    db.exec("ALTER TABLE stages ADD COLUMN icon TEXT DEFAULT NULL");
    console.log('[DB] stages 파밍/이벤트 필드 마이그레이션 완료');
  }

  try {
    db.prepare("SELECT bg_image FROM stages LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE stages ADD COLUMN bg_image TEXT DEFAULT NULL");
    console.log('[DB] stages bg_image 마이그레이션 완료');
  }

  // stages max_cycles 마이그레이션
  try {
    db.prepare("SELECT max_cycles FROM stages LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE stages ADD COLUMN max_cycles INTEGER DEFAULT NULL");
    console.log('[DB] stages max_cycles 마이그레이션 완료');
  }

  // story_nodes max_cycles 마이그레이션
  try {
    db.prepare("SELECT max_cycles FROM story_nodes LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE story_nodes ADD COLUMN max_cycles INTEGER DEFAULT NULL");
    console.log('[DB] story_nodes max_cycles 마이그레이션 완료');
  }

  // raids 신규 컬럼 마이그레이션
  try {
    db.prepare("SELECT boss_key FROM raids LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE raids ADD COLUMN boss_key TEXT DEFAULT NULL");
    db.exec("ALTER TABLE raids ADD COLUMN battle_hp INTEGER DEFAULT 800");
    db.exec("ALTER TABLE raids ADD COLUMN per_battle_gold INTEGER DEFAULT 400");
    db.exec("ALTER TABLE raids ADD COLUMN origin TEXT DEFAULT 'neutral'");
    db.exec("ALTER TABLE raids ADD COLUMN settled INTEGER DEFAULT 0");
    db.exec("UPDATE raids SET settled = 1 WHERE boss_key IS NULL");
    console.log('[DB] raids 신규 컬럼 마이그레이션 완료');
  }

  // 계정 레벨 시스템 마이그레이션
  try {
    db.prepare("SELECT account_level FROM users LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE users ADD COLUMN account_level INTEGER DEFAULT 1");
    db.exec("ALTER TABLE users ADD COLUMN account_exp INTEGER DEFAULT 0");
    console.log('[DB] 계정 레벨 시스템 마이그레이션 완료');
  }

  try {
    db.prepare("SELECT session_id FROM users LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE users ADD COLUMN session_id TEXT DEFAULT NULL");
    console.log('[DB] users.session_id 마이그레이션 완료');
  }

  // 스토리 노드 테이블
  db.exec(`CREATE TABLE IF NOT EXISTS story_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL DEFAULT 'main',
    chapter INTEGER NOT NULL DEFAULT 1,
    node_number INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL,
    node_type TEXT NOT NULL DEFAULT 'story',
    story_script TEXT DEFAULT NULL,
    enemy_data TEXT DEFAULT NULL,
    stamina_cost INTEGER DEFAULT 0,
    rewards TEXT DEFAULT NULL,
    recommended_level INTEGER DEFAULT 1,
    difficulty TEXT DEFAULT 'normal',
    character_id INTEGER DEFAULT NULL,
    event_id TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // story_nodes description 마이그레이션
  try {
    db.prepare("SELECT description FROM story_nodes LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE story_nodes ADD COLUMN description TEXT DEFAULT NULL");
    console.log('[DB] story_nodes description 마이그레이션 완료');
  }

  // story_nodes fixed_party / required_guests 마이그레이션
  try {
    db.prepare("SELECT fixed_party FROM story_nodes LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE story_nodes ADD COLUMN fixed_party TEXT DEFAULT NULL");
    console.log('[DB] story_nodes fixed_party 마이그레이션 완료');
  }
  try {
    db.prepare("SELECT required_guests FROM story_nodes LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE story_nodes ADD COLUMN required_guests TEXT DEFAULT NULL");
    console.log('[DB] story_nodes required_guests 마이그레이션 완료');
  }

  // monsters ai_type 마이그레이션
  try {
    db.prepare("SELECT ai_type FROM monsters LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE monsters ADD COLUMN ai_type TEXT DEFAULT 'basic'");
    console.log('[DB] monsters ai_type 마이그레이션 완료');
  }

  // monsters category 마이그레이션
  try {
    db.prepare("SELECT category FROM monsters LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE monsters ADD COLUMN category TEXT DEFAULT NULL");
    const categorize = [
      { pattern: '%_farming_data_%', category: '속성파밍' },
      { pattern: 'awaken_elem_guard_%', category: '속성파밍' },
      { pattern: 'awaken_origin_%', category: '근원파밍' },
      { pattern: 'awaken_origin_guard_%', category: '근원파밍' },
    ];
    for (const c of categorize) {
      db.prepare('UPDATE monsters SET category = ? WHERE id LIKE ? AND category IS NULL').run(c.category, c.pattern);
    }
    console.log('[DB] monsters category 마이그레이션 완료');
  }

  // stages bgm 마이그레이션
  try {
    db.prepare("SELECT bgm FROM stages LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE stages ADD COLUMN bgm TEXT DEFAULT NULL");
    console.log('[DB] stages bgm 마이그레이션 완료');
  }

  // story_nodes bgm 마이그레이션
  try {
    db.prepare("SELECT bgm FROM story_nodes LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE story_nodes ADD COLUMN bgm TEXT DEFAULT NULL");
    console.log('[DB] story_nodes bgm 마이그레이션 완료');
  }

  // raids bgm 마이그레이션
  try {
    db.prepare("SELECT bgm FROM raids LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE raids ADD COLUMN bgm TEXT DEFAULT NULL");
    console.log('[DB] raids bgm 마이그레이션 완료');
  }

  // is_released 마이그레이션
  try {
    db.prepare("SELECT is_released FROM characters LIMIT 1").get();
  } catch {
    db.exec("ALTER TABLE characters ADD COLUMN is_released INTEGER DEFAULT 1");
    db.exec("UPDATE characters SET is_released = 0 WHERE rarity = 'CR'");
    console.log('[DB] characters is_released 마이그레이션 완료');
  }

  db.exec(`CREATE TABLE IF NOT EXISTS story_clears (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    node_id INTEGER NOT NULL,
    stars INTEGER DEFAULT 0,
    best_turns INTEGER,
    cleared_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (node_id) REFERENCES story_nodes(id),
    UNIQUE(user_id, node_id)
  )`);

  // tags 정의 테이블
  db.exec(`CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL UNIQUE
  )`);

  // character_tags 테이블 (tag_id 기반)
  try {
    db.prepare("SELECT tag_id FROM character_tags LIMIT 1").get();
  } catch {
    db.exec("DROP TABLE IF EXISTS character_tags");
    db.exec(`CREATE TABLE IF NOT EXISTS character_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      FOREIGN KEY (character_id) REFERENCES characters(id),
      FOREIGN KEY (tag_id) REFERENCES tags(id),
      UNIQUE(character_id, tag_id)
    )`);
  }

  // monster_tags 테이블
  db.exec(`CREATE TABLE IF NOT EXISTS monster_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monster_id TEXT NOT NULL,
    tag_id INTEGER NOT NULL,
    FOREIGN KEY (monster_id) REFERENCES monsters(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id),
    UNIQUE(monster_id, tag_id)
  )`);

  // party_presets 테이블
  db.exec(`CREATE TABLE IF NOT EXISTS party_presets (
    user_id INTEGER NOT NULL,
    slot INTEGER NOT NULL DEFAULT 0,
    name TEXT DEFAULT '',
    party_ids TEXT DEFAULT '[]',
    PRIMARY KEY (user_id, slot)
  )`);

  // user_logs 테이블 (활동 기록)
  db.exec(`CREATE TABLE IF NOT EXISTS user_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    data TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // user_items 테이블 (아이템 인벤토리)
  db.exec(`CREATE TABLE IF NOT EXISTS user_items (
    user_id INTEGER NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, item_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  // 스킬 extra 데이터 패치
  const skillExtraPatches = {
    125: { hpLostCostReduce: { trackerKey: 'skill_125', hpPercentPerStack: 0.05, reductionPerStack: 1 } },
    160: { effects: [{ type: 'applyStatus', statusKey: 'submerge', displayName: '수몰', turns: 2, scope: 'enemies' }] },
  };
  for (const [skillId, extraData] of Object.entries(skillExtraPatches)) {
    try {
      const row = db.prepare('SELECT extra FROM skills WHERE id = ?').get(Number(skillId));
      if (row && (!row.extra || row.extra === '{}')) {
        db.prepare('UPDATE skills SET extra = ? WHERE id = ?').run(JSON.stringify(extraData), Number(skillId));
        console.log(`[DB] 스킬 ${skillId} extra 패치 완료`);
      }
    } catch {}
  }

  // 메타포 스킬 extra + target 패치
  const metaphorPatches = [
    { id: 124, extra: { effects: [{ type: 'applyStatus', statusKey: 'light_vulnerability', displayName: '광 속성 취약', turns: 1, scope: 'target' }] } },
    { id: 155, extra: { stat: 'spd', turns: 3, taunt_gain: 3 }, power: 0.2 },
    { id: 156, extra: { illusion_gain: 1, ally_heal_ratio: 0.5 }, target: 'any_single' },
    { id: 157, extra: { consume_illusion: true, power_per_stack: 0.25 } },
    { id: 158, extra: { effects: [{ type: 'applyStatus', statusKey: 'dark_vulnerability', displayName: '암 속성 취약', turns: 1, scope: 'target' }] } },
    { id: 159, extra: { next_cycle_spd_buff: { amount: 0.15, turns: 1 } } },
  ];
  for (const patch of metaphorPatches) {
    try {
      const row = db.prepare('SELECT extra FROM skills WHERE id = ?').get(patch.id);
      if (row) {
        db.prepare('UPDATE skills SET extra = ? WHERE id = ?').run(JSON.stringify(patch.extra), patch.id);
        if (patch.target) db.prepare('UPDATE skills SET target = ? WHERE id = ?').run(patch.target, patch.id);
        if (patch.power !== undefined) db.prepare('UPDATE skills SET power = ? WHERE id = ?').run(patch.power, patch.id);
        console.log(`[DB] 스킬 ${patch.id} 메타포 패치 완료`);
      }
    } catch {}
  }

  // 시스투스/베르트랑/아우라 스킬 extra 패치
  const charSkillPatches = [
    { id: 4, extra: { noteRestore: 3 } },
    { id: 123, extra: { effects: [{ type: 'applyStatus', statusKey: 'color_extract', displayName: '색 추출', turns: 99, scope: 'target' }], color_extract: { atkRatio: 3.0 } } },
    { id: 127, extra: { hpCost: 0.1, taunt_gain: 5 } },
    { id: 131, extra: { selfHeal: 0.5 } },
    { id: 132, extra: { deflect: { hpThreshold: 0.1 } } },
    { id: 133, extra: { encore_grant: 1 } },
    { id: 135, extra: { noteRestoreIfZero: 5 } },
    { id: 136, extra: { grantExtraTurn: true } },
    { id: 162, extra: { taunt_gain: 1, bonus_taunt_on_prior_defense: 2 } },
    { id: 163, extra: { shield: { atkRatio: 4.0, scope: 'party' } } },
    { id: 164, extra: { taunt_gain: 4, cleanse_def_debuff: 1 } },
    { id: 165, extra: { shield: { atkRatio: 1.5 } } },
    { id: 7, extra: { stat: 'def', turns: 3 } },
    { id: 161, extra: { attackCountCostReduce: 1 } },
    { id: 166, extra: { prepare: { damageMult: 2, costMult: 2 }, ignore_overload: true } },
    { id: 167, extra: { storm_stacks: 2 } },
    { id: 160, extra: { party_ignore_def: { amount: 0.5, turns: 2 }, cd_reduce_on_buff: true } },
    { id: 168, extra: { cycle_taunt_grant: { stacks: 2, turns: 3 } } },
    { id: 169, extra: { light_damage_boost: { amount: 0.5, turns: 3 } } },
  ];
  for (const patch of charSkillPatches) {
    try {
      const row = db.prepare('SELECT extra FROM skills WHERE id = ?').get(patch.id);
      if (row) {
        db.prepare('UPDATE skills SET extra = ? WHERE id = ?').run(JSON.stringify(patch.extra), patch.id);
        console.log(`[DB] 스킬 ${patch.id} extra 패치 완료`);
      }
    } catch {}
  }

  // ============ 게임 데이터 시드 (JSON 우선, 없으면 하드코딩 폴백) ============
  const charCount = db.prepare('SELECT COUNT(*) as cnt FROM characters').get();
  const skillCount = db.prepare('SELECT COUNT(*) as cnt FROM skills').get();

  if (charCount.cnt === 0 && skillCount.cnt === 0) {
    let seedData = null;
    if (fs.existsSync(SEED_PATH)) {
      try {
        seedData = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
        console.log('[DB] game_seed.json 발견 - JSON 시드에서 로드');
      } catch (e) {
        console.error('[DB] game_seed.json 파싱 실패, 하드코딩 폴백:', e.message);
      }
    }

    if (seedData) {
      // JSON 시드에서 로드
      const charCols = ['name','rarity','element','origin','title','description','quote','base_hp','base_atk','base_def','base_spd','turn_notes','image_url','image_bust','image_sd','image_ld','is_limited','attack_slots','defense_slots'];
      for (const c of seedData.characters) {
        const vals = charCols.map(k => c[k] ?? '');
        const placeholders = charCols.map(() => '?').join(', ');
        db.prepare(`INSERT INTO characters (${charCols.join(', ')}) VALUES (${placeholders})`).run(...vals);
      }
      console.log(`[DB] ${seedData.characters.length}개 캐릭터 시드 완료 (JSON)`);

      const sCols = ['name','description','type','rarity','cost','power','element','target','defense_mult','cooldown','extra','equip_condition','obtainable'];
      for (const s of seedData.skills) {
        const vals = sCols.map(k => {
          if (k === 'equip_condition') return typeof s[k] === 'object' ? JSON.stringify(s[k]) : (s[k] ?? '{}');
          if (k === 'obtainable') return s[k] !== undefined ? s[k] : 1;
          return s[k] ?? '';
        });
        const placeholders = sCols.map(() => '?').join(', ');
        db.prepare(`INSERT INTO skills (${sCols.join(', ')}) VALUES (${placeholders})`).run(...vals);
      }
      console.log(`[DB] ${seedData.skills.length}개 스킬 시드 완료 (JSON)`);

      const getSkillId = (name) => db.prepare('SELECT id FROM skills WHERE name = ?').get(name)?.id;
      const getCharId = (name) => db.prepare('SELECT id FROM characters WHERE name = ?').get(name)?.id;
      for (const m of seedData.characterSkills) {
        const charId = getCharId(m.charName);
        const skillId = getSkillId(m.skillName);
        if (!charId || !skillId) continue;
        const awkReq = m.awakening_required !== undefined ? m.awakening_required : (m.is_default ? 0 : -1);
        try {
          db.prepare('INSERT OR IGNORE INTO character_skills (character_id, skill_id, is_default, is_fixed, awakening_required) VALUES (?, ?, ?, ?, ?)')
            .run(charId, skillId, awkReq === 0 ? 1 : 0, m.is_fixed, awkReq);
        } catch (e) {}
      }
      console.log(`[DB] ${seedData.characterSkills.length}개 캐릭터-스킬 매핑 완료 (JSON)`);
    } else {
      console.error('[치명] data/game_seed.json 파일이 없습니다. 캐릭터/스킬 시드를 위해 이 파일이 필요합니다.');
      process.exit(1);
    }
  }

  // ============ 몬스터 테이블 ============
  db.exec(`CREATE TABLE IF NOT EXISTS monsters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    element TEXT DEFAULT 'neutral',
    origin TEXT DEFAULT 'force',
    image_sd TEXT DEFAULT NULL,
    is_boss INTEGER DEFAULT 0,
    hp INTEGER DEFAULT 100,
    atk INTEGER DEFAULT 10,
    def INTEGER DEFAULT 5,
    spd INTEGER DEFAULT 5,
    turn_notes INTEGER DEFAULT 3,
    skills TEXT DEFAULT '[]',
    drops TEXT DEFAULT '[]'
  )`);

  // ============ 몬스터 시드 (game_seed.json 우선, 없으면 monsters.js 폴백) ============
  const monsterCount = db.prepare('SELECT COUNT(*) as cnt FROM monsters').get();
  if (monsterCount.cnt === 0) {
    let seedMonsters = null;
    if (fs.existsSync(SEED_PATH)) {
      try { seedMonsters = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8')).monsters; } catch {}
    }
    if (seedMonsters && seedMonsters.length > 0) {
      for (const mon of seedMonsters) {
        db.prepare('INSERT INTO monsters (id, name, element, origin, image_sd, is_boss, hp, atk, def, spd, turn_notes, skills, drops) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(mon.id, mon.name, mon.element, mon.origin, mon.image_sd || null, mon.is_boss || 0,
            mon.hp, mon.atk, mon.def, mon.spd, mon.turn_notes || 3,
            typeof mon.skills === 'string' ? mon.skills : JSON.stringify(mon.skills || []),
            typeof mon.drops === 'string' ? mon.drops : JSON.stringify(mon.drops || []));
      }
      console.log(`[DB] ${seedMonsters.length}개 몬스터 시드 완료 (game_seed.json)`);
    } else {
      const monstersFile = require('../data/monsters');
      for (const mon of Object.values(monstersFile)) {
        db.prepare('INSERT INTO monsters (id, name, element, origin, image_sd, is_boss, hp, atk, def, spd, turn_notes, skills, drops) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(mon.id, mon.name, mon.element, mon.origin, mon.image_sd || null, mon.isBoss ? 1 : 0,
            mon.hp, mon.atk, mon.def, mon.spd, mon.turn_notes || 3,
            JSON.stringify(mon.skills || []), JSON.stringify(mon.drops || []));
      }
      console.log(`[DB] ${Object.keys(monstersFile).length}개 몬스터 시드 완료 (monsters.js)`);
    }
  }

  // 몬스터 스킬 등록 (skills 테이블에 obtainable=0으로)
  {
    const allMonsters = db.prepare('SELECT * FROM monsters').all();
    const allMonsterSkills = [];
    for (const mon of allMonsters) {
      for (const sk of JSON.parse(mon.skills || '[]')) {
        if (!allMonsterSkills.find(s => s.id === sk.id)) allMonsterSkills.push(sk);
      }
    }
    let registered = 0;
    for (const sk of allMonsterSkills) {
      const exists = db.prepare('SELECT id FROM skills WHERE id = ?').get(sk.id);
      if (exists) continue;
      const extraStr = sk.extra ? JSON.stringify(sk.extra) : '{}';
      db.prepare('INSERT INTO skills (id, name, description, type, rarity, cost, power, element, target, defense_mult, cooldown, extra, obtainable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(sk.id, sk.name, '', sk.type, 'faint', sk.cost, sk.power || 0, sk.element || 'neutral', sk.target || 'single', sk.defense_mult || 0, 0, extraStr, 0);
      registered++;
    }
    if (registered > 0) console.log(`[DB] ${registered}개 몬스터 스킬 등록 완료 (obtainable=0)`);
  }

  // ============ 스테이지 시드 (game_seed.json 우선, 없으면 stages.js 폴백) ============
  const stageCount = db.prepare('SELECT COUNT(*) as cnt FROM stages').get();
  if (stageCount.cnt === 0) {
    let seedStages = null;
    if (fs.existsSync(SEED_PATH)) {
      try { seedStages = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8')).stages; } catch {}
    }
    if (seedStages && seedStages.length > 0) {
      const stageCols = ['chapter','stage_number','name','difficulty','stamina_cost','recommended_level',
        'enemy_data','rewards','story_script','type','open_days','always_open','unlock_condition',
        'dungeon_group','description','icon'];
      for (const s of seedStages) {
        const vals = stageCols.map(k => {
          const v = s[k];
          if (v === undefined || v === null) return null;
          if (typeof v === 'object') return JSON.stringify(v);
          return v;
        });
        db.prepare(`INSERT INTO stages (${stageCols.join(',')}) VALUES (${stageCols.map(() => '?').join(',')})`)
          .run(...vals);
      }
      console.log(`[DB] ${seedStages.length}개 스테이지 시드 완료 (game_seed.json)`);
    } else {
      const stageDefs = require('../data/stages');
      for (const stage of stageDefs) {
        const enemies = stage.enemies.map(e => {
          const monRow = db.prepare('SELECT * FROM monsters WHERE id = ?').get(e.id);
          if (!monRow) { console.warn(`[DB] 몬스터 '${e.id}' 없음, 스킵`); return null; }
          const scale = e.level_scale || 1.0;
          return {
            monsterId: e.id, name: e.name_override || monRow.name,
            element: monRow.element, origin: monRow.origin,
            hp: Math.round(monRow.hp * scale), atk: Math.round(monRow.atk * scale),
            def: Math.round(monRow.def * scale), spd: Math.round(monRow.spd * scale),
            turn_notes: monRow.turn_notes, isBoss: !!monRow.is_boss,
            image_sd: monRow.image_sd || null,
            skills: JSON.parse(monRow.skills || '[]'), drops: JSON.parse(monRow.drops || '[]'),
          };
        }).filter(Boolean);
        db.prepare('INSERT INTO stages (chapter, stage_number, name, difficulty, stamina_cost, recommended_level, enemy_data, rewards) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(stage.chapter, stage.stage_number, stage.name, stage.difficulty || 'normal',
            stage.stamina_cost, stage.recommended_level,
            JSON.stringify(enemies), JSON.stringify(stage.rewards));
      }
      console.log(`[DB] ${stageDefs.length}개 스테이지 시드 완료 (stages.js)`);
    }
  }

  // ============ 파밍 던전 스테이지 동기화 ============
  {
    const { farmingDungeons } = require('../data/farming_dungeons');
    const expectedNames = new Set();
    let addedStages = 0;
    const PREV_DIFF = { mid: 'low', high: 'mid', top: 'high' };
    for (const [dungeonKey, dungeon] of Object.entries(farmingDungeons)) {
      for (const [diffKey, diff] of Object.entries(dungeon.difficulties)) {
        const groupName = dungeon.dungeonGroup || dungeon.label;
        const stageName = dungeon.dungeonGroup
          ? (diff.label ? `${dungeon.label} ${diff.label}` : dungeon.label)
          : `${dungeon.label} - ${diff.label}`;
        expectedNames.add(stageName);
        const isAlwaysOpen = dungeon.alwaysOpen ? 1 : 0;
        const openDays = dungeon.openDays ? JSON.stringify(dungeon.openDays) : null;
        const unlockCond = PREV_DIFF[diffKey]
          ? JSON.stringify({ type: 'farming_prev_clear', dungeonGroup: groupName, prevDifficulty: PREV_DIFF[diffKey], baseName: dungeon.label })
          : null;
        const enemyData = diff.enemies.map(e => {
          if (e.pool) {
            const validPool = e.pool.filter(pid => db.prepare('SELECT id FROM monsters WHERE id = ?').get(pid));
            if (validPool.length === 0) return null;
            return { pool: validPool, level_scale: e.level_scale || 1.0 };
          }
          const monRow = db.prepare('SELECT * FROM monsters WHERE id = ?').get(e.id);
          if (!monRow) return null;
          const scale = e.level_scale || 1.0;
          return {
            monsterId: e.id, name: monRow.name,
            element: monRow.element, origin: monRow.origin,
            hp: Math.round(monRow.hp * scale), atk: Math.round(monRow.atk * scale),
            def: Math.round(monRow.def * scale), spd: Math.round(monRow.spd * scale),
            turn_notes: monRow.turn_notes, isBoss: !!monRow.is_boss,
            image_sd: monRow.image_sd || null,
            skills: JSON.parse(monRow.skills || '[]'),
            drops: e.dropOverrides || JSON.parse(monRow.drops || '[]'),
          };
        }).filter(Boolean);
        const enemyDataStr = JSON.stringify(enemyData);
        const rewardsStr = JSON.stringify(diff.rewards);
        const stageType = dungeon.type || 'farming';
        db.prepare('DELETE FROM stages WHERE name = ? AND dungeon_group = ? AND type != ?').run(stageName, groupName, stageType);
        const existing = db.prepare('SELECT id FROM stages WHERE name = ? AND type = ?').get(stageName, stageType);
        if (existing) {
          // 이미 존재하면 어드민 수정 보존을 위해 스킵
        } else {
          db.prepare(`INSERT INTO stages (name, type, difficulty, stamina_cost, recommended_level,
            enemy_data, rewards, dungeon_group, description, icon, always_open, open_days, unlock_condition, chapter, stage_number)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`)
            .run(stageName, stageType, diffKey, diff.staminaCost, diff.recommendedLv,
              enemyDataStr, rewardsStr, groupName, dungeon.desc, dungeon.icon, isAlwaysOpen, openDays, unlockCond);
          addedStages++;
        }
      }
    }
    const obsolete = db.prepare("SELECT id, name FROM stages WHERE type IN ('farming', 'normal')").all()
      .filter(s => !expectedNames.has(s.name));
    if (obsolete.length > 0) {
      for (const s of obsolete) db.prepare('DELETE FROM stages WHERE id = ?').run(s.id);
      console.log(`[DB] ${obsolete.length}개 구 파밍 스테이지 제거`);
    }
    if (addedStages > 0) console.log(`[DB] ${addedStages}개 파밍 던전 스테이지 추가 완료`);
  }

  // ============ 스토리 노드 시드 (game_seed.json → stories.js) ============
  const storiesFilePath = path.join(__dirname, '..', 'data', 'stories.js');
  let currentStories = [];
  try { currentStories = require(storiesFilePath); } catch {}
  if (currentStories.length === 0) {
    let seedStoryNodes = null;
    if (fs.existsSync(SEED_PATH)) {
      try { seedStoryNodes = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8')).storyNodes; } catch {}
    }
    if (seedStoryNodes && seedStoryNodes.length > 0) {
      const parsed = seedStoryNodes.map((n, i) => {
        const node = { id: n.id || (i + 1) };
        for (const k of ['category','chapter','node_number','title','node_type','story_script',
          'enemy_data','stamina_cost','rewards','recommended_level','difficulty',
          'character_id','event_id','description','fixed_party','required_guests','bgm','max_cycles']) {
          let v = n[k];
          if (v === undefined) v = null;
          if (typeof v === 'string' && (k === 'story_script' || k === 'enemy_data' || k === 'rewards' || k === 'fixed_party' || k === 'required_guests')) {
            try { v = JSON.parse(v); } catch {}
          }
          node[k] = v;
        }
        return node;
      });
      fs.writeFileSync(storiesFilePath, `const stories = ${JSON.stringify(parsed, null, 2)};\n\nmodule.exports = stories;\n`, 'utf-8');
      console.log(`[DB] ${parsed.length}개 스토리 노드 시드 완료 (game_seed.json → stories.js)`);
    }
  }

  // ============ 태그 시드 (game_seed.json) ============
  const tagCount = db.prepare('SELECT COUNT(*) as cnt FROM tags').get();
  if (tagCount.cnt === 0) {
    let seedData = null;
    if (fs.existsSync(SEED_PATH)) {
      try { seedData = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8')); } catch {}
    }
    if (seedData?.tags && seedData.tags.length > 0) {
      for (const t of seedData.tags) {
        db.prepare('INSERT INTO tags (id, label) VALUES (?, ?)').run(t.id, t.label);
      }
      console.log(`[DB] ${seedData.tags.length}개 태그 시드 완료`);
      if (seedData.characterTags) {
        for (const ct of seedData.characterTags) {
          try { db.prepare('INSERT OR IGNORE INTO character_tags (character_id, tag_id) VALUES (?, ?)').run(ct.character_id, ct.tag_id); } catch {}
        }
        console.log(`[DB] ${seedData.characterTags.length}개 캐릭터 태그 시드 완료`);
      }
      if (seedData.monsterTags) {
        for (const mt of seedData.monsterTags) {
          try { db.prepare('INSERT OR IGNORE INTO monster_tags (monster_id, tag_id) VALUES (?, ?)').run(mt.monster_id, mt.tag_id); } catch {}
        }
        console.log(`[DB] ${seedData.monsterTags.length}개 몬스터 태그 시드 완료`);
      }
    }
  }

  // ============ 레이드 시드 (raid_bosses.js 기반) ============
  {
    const activeRaid = db.prepare('SELECT id FROM raids WHERE is_active = 1').get();
    if (!activeRaid) {
      const { raidBosses, bossRotation, RESET_DAY } = require('../data/raid_bosses');
      const lastRaid = db.prepare('SELECT boss_key FROM raids ORDER BY id DESC LIMIT 1').get();
      const lastIdx = lastRaid?.boss_key ? bossRotation.indexOf(lastRaid.boss_key) : -1;
      const bossKey = bossRotation[(lastIdx + 1) % bossRotation.length];
      const b = raidBosses[bossKey];
      if (b) {
        const now = new Date();
        const day = now.getDay();
        let daysUntil = (RESET_DAY - day + 7) % 7;
        if (daysUntil === 0 && now.getHours() >= 6) daysUntil = 7;
        const endsAt = new Date(now);
        endsAt.setDate(endsAt.getDate() + (daysUntil || 7));
        endsAt.setHours(6, 0, 0, 0);
        db.prepare(`INSERT INTO raids
          (name, element, origin, max_hp, current_hp, base_atk, base_def, base_spd, turn_notes,
           attack_pattern, rewards, starts_at, ends_at, is_active, boss_key, battle_hp, per_battle_gold, settled)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 0)`)
          .run(b.name, b.element, b.origin || 'neutral', b.maxHp, b.maxHp,
            b.atk, b.def, b.spd, b.turnNotes,
            JSON.stringify(b.phases.map(p => ({ hp_threshold: p.hpThreshold, skills: p.skills }))),
            JSON.stringify({ gold: 5000, prism: 100 }),
            now.toISOString(), endsAt.toISOString(),
            bossKey, b.battleHp || 800, b.perBattleGold || 400);
        console.log(`[DB] 레이드 시드 완료: ${b.name} (${bossKey})`);
      }
    }
  }

  db._saveSync();
  console.log('[DB] 초기화 완료');
  return db;
}

// 스킬 타입 → 슬롯 타입
const DEFENSE_SKILL_TYPES = ['defense'];
function getSlotTypeForSkill(type) {
  return DEFENSE_SKILL_TYPES.includes(type) ? 'defense' : 'attack';
}

// 캐릭터 획득/각성 시 스킬 부여
function initCharacterSkills(userId, inventoryId, characterId, awakeningLevel) {
  if (awakeningLevel === undefined) awakeningLevel = 0;
  const skills = dbProxy.prepare(`
    SELECT s.*, cs.is_fixed FROM character_skills cs JOIN skills s ON cs.skill_id = s.id
    WHERE cs.character_id = ? AND cs.awakening_required >= 0 AND cs.awakening_required <= ?
  `).all(characterId, awakeningLevel);

  const occupied = dbProxy.prepare('SELECT slot_type, slot_number FROM equipped_skills WHERE inventory_id = ?').all(inventoryId);
  const atkOccupied = new Set(occupied.filter(o => o.slot_type === 'attack').map(o => o.slot_number));
  const defOccupied = new Set(occupied.filter(o => o.slot_type === 'defense').map(o => o.slot_number));

  for (const s of skills) {
    const already = dbProxy.prepare('SELECT 1 FROM equipped_skills WHERE inventory_id = ? AND skill_id = ?').get(inventoryId, s.id);
    if (already) continue;

    const st = getSlotTypeForSkill(s.type);
    const occ = st === 'attack' ? atkOccupied : defOccupied;
    let nextSlot = -1;
    for (let i = 0; i < 10; i++) { if (!occ.has(i)) { nextSlot = i; break; } }
    if (nextSlot === -1) continue;
    occ.add(nextSlot);

    let siId = null;
    if (!s.is_fixed) {
      const si = dbProxy.prepare('INSERT INTO skill_inventory (user_id, skill_id, obtained_from) VALUES (?, ?, ?)')
        .run(userId, s.id, awakeningLevel === 0 ? 'character' : 'awakening');
      siId = si.lastInsertRowid;
    }
    dbProxy.prepare('INSERT INTO equipped_skills (inventory_id, skill_id, slot_number, slot_type, is_fixed, skill_inventory_id) VALUES (?, ?, ?, ?, ?, ?)')
      .run(inventoryId, s.id, nextSlot, st, s.is_fixed ? 1 : 0, siId);
  }
  dbProxy.prepare('UPDATE inventory SET skills_initialized = 1 WHERE id = ?').run(inventoryId);
}

// 각성 시 해당 단계 스킬만 부여
function grantAwakeningSkills(userId, inventoryId, characterId, awakeningLevel) {
  const skills = dbProxy.prepare(`
    SELECT s.*, cs.is_fixed FROM character_skills cs JOIN skills s ON cs.skill_id = s.id
    WHERE cs.character_id = ? AND cs.awakening_required = ?
  `).all(characterId, awakeningLevel);
  if (skills.length === 0) return [];

  const occupied = dbProxy.prepare('SELECT slot_type, slot_number FROM equipped_skills WHERE inventory_id = ?').all(inventoryId);
  const atkOccupied = new Set(occupied.filter(o => o.slot_type === 'attack').map(o => o.slot_number));
  const defOccupied = new Set(occupied.filter(o => o.slot_type === 'defense').map(o => o.slot_number));
  const granted = [];

  for (const s of skills) {
    const st = getSlotTypeForSkill(s.type);
    const occ = st === 'attack' ? atkOccupied : defOccupied;
    let nextSlot = -1;
    for (let i = 0; i < 10; i++) { if (!occ.has(i)) { nextSlot = i; break; } }

    let siId = null;
    if (!s.is_fixed) {
      const si = dbProxy.prepare('INSERT INTO skill_inventory (user_id, skill_id, obtained_from) VALUES (?, ?, ?)')
        .run(userId, s.id, 'awakening');
      siId = si.lastInsertRowid;
    }

    if (nextSlot !== -1) {
      occ.add(nextSlot);
      dbProxy.prepare('INSERT INTO equipped_skills (inventory_id, skill_id, slot_number, slot_type, is_fixed, skill_inventory_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(inventoryId, s.id, nextSlot, st, s.is_fixed ? 1 : 0, siId);
    }
    granted.push({ id: s.id, name: s.name, type: s.type, equipped: nextSlot !== -1 });
  }
  return granted;
}

// 장착 조건 체크
const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'CR'];
function checkEquipCondition(conditionJson, character) {
  const condition = typeof conditionJson === 'string' ? JSON.parse(conditionJson || '{}') : (conditionJson || {});
  if (Object.keys(condition).length === 0) return true;
  for (const [key, value] of Object.entries(condition)) {
    if (key === 'element') {
      if (Array.isArray(value) ? !value.includes(character.element) : character.element !== value) return false;
    } else if (key === 'origin') {
      if (Array.isArray(value) ? !value.includes(character.origin) : character.origin !== value) return false;
    } else if (key === 'minRarity') {
      if (RARITY_ORDER.indexOf(character.rarity) < RARITY_ORDER.indexOf(value)) return false;
    }
  }
  return true;
}

function exportGameData() {
  try {
    const characters = dbProxy.prepare('SELECT * FROM characters ORDER BY id').all();
    const skills = dbProxy.prepare('SELECT * FROM skills ORDER BY id').all();
    const mappings = dbProxy.prepare(`
      SELECT cs.*, c.name as charName, s.name as skillName
      FROM character_skills cs
      JOIN characters c ON cs.character_id = c.id
      JOIN skills s ON cs.skill_id = s.id
      ORDER BY cs.character_id, cs.skill_id
    `).all();
    const monsters = dbProxy.prepare('SELECT * FROM monsters ORDER BY id').all();
    const stages = dbProxy.prepare('SELECT * FROM stages ORDER BY id').all();
    const storiesPath = path.join(__dirname, '..', 'data', 'stories.js');
    let storyNodes = [];
    try { storyNodes = require(storiesPath); } catch {}
    const tags = dbProxy.prepare('SELECT * FROM tags ORDER BY id').all();
    const characterTags = dbProxy.prepare('SELECT * FROM character_tags ORDER BY character_id, tag_id').all();
    const monsterTags = dbProxy.prepare('SELECT * FROM monster_tags ORDER BY monster_id, tag_id').all();
    const raids = dbProxy.prepare('SELECT * FROM raids ORDER BY id').all();

    const data = {
      characters,
      skills,
      characterSkills: mappings.map(m => ({
        charName: m.charName,
        skillName: m.skillName,
        awakening_required: m.awakening_required ?? 0,
        is_fixed: m.is_fixed,
      })),
      monsters,
      stages,
      storyNodes,
      tags,
      characterTags,
      monsterTags,
      raids,
    };

    fs.writeFileSync(SEED_PATH, JSON.stringify(data, null, 2), 'utf-8');
    console.log('[DB] game_seed.json 자동 저장 완료');
  } catch (e) {
    console.error('[DB] game_seed.json 저장 실패:', e.message);
  }
}

function resetUserData() {
  const tables = [
    'user_items', 'party_presets', 'mail', 'daily_missions',
    'raid_entries', 'story_clears', 'stage_clears', 'pull_log',
    'trades', 'equipped_skills', 'skill_inventory', 'inventory', 'users'
  ];
  for (const t of tables) {
    dbProxy.prepare(`DELETE FROM ${t}`).run();
  }
  dbProxy._saveSync();
  console.log('[DB] 유저 데이터 리셋 완료');
}

// 승급 시 해당 단계 스킬 부여 (awakening_required: 11=1차, 12=2차, 13=3차)
function grantPromotionSkills(userId, inventoryId, characterId, promotionLevel) {
  const reqValue = 10 + promotionLevel; // 1→11, 2→12, 3→13
  const skills = dbProxy.prepare(`
    SELECT s.*, cs.is_fixed FROM character_skills cs JOIN skills s ON cs.skill_id = s.id
    WHERE cs.character_id = ? AND cs.awakening_required = ?
  `).all(characterId, reqValue);
  if (skills.length === 0) return [];

  const occupied = dbProxy.prepare('SELECT slot_type, slot_number FROM equipped_skills WHERE inventory_id = ?').all(inventoryId);
  const atkOccupied = new Set(occupied.filter(o => o.slot_type === 'attack').map(o => o.slot_number));
  const defOccupied = new Set(occupied.filter(o => o.slot_type === 'defense').map(o => o.slot_number));
  const granted = [];

  for (const s of skills) {
    const st = getSlotTypeForSkill(s.type);
    const occ = st === 'attack' ? atkOccupied : defOccupied;
    let nextSlot = -1;
    for (let i = 0; i < 10; i++) { if (!occ.has(i)) { nextSlot = i; break; } }

    let siId = null;
    if (!s.is_fixed) {
      const si = dbProxy.prepare('INSERT INTO skill_inventory (user_id, skill_id, obtained_from) VALUES (?, ?, ?)')
        .run(userId, s.id, 'promotion');
      siId = si.lastInsertRowid;
    }

    if (nextSlot !== -1) {
      occ.add(nextSlot);
      dbProxy.prepare('INSERT INTO equipped_skills (inventory_id, skill_id, slot_number, slot_type, is_fixed, skill_inventory_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(inventoryId, s.id, nextSlot, st, s.is_fixed ? 1 : 0, siId);
    }
    granted.push({ id: s.id, name: s.name, type: s.type, equipped: nextSlot !== -1 });
  }
  return granted;
}

function userLog(userId, type, data) {
  try {
    dbProxy.prepare('INSERT INTO user_logs (user_id, type, data) VALUES (?, ?, ?)').run(userId, type, JSON.stringify(data));
  } catch {}
}

module.exports = dbProxy;
module.exports.initDb = initDb;
module.exports.initCharacterSkills = initCharacterSkills;
module.exports.grantAwakeningSkills = grantAwakeningSkills;
module.exports.grantPromotionSkills = grantPromotionSkills;
module.exports.checkEquipCondition = checkEquipCondition;
module.exports.exportGameData = exportGameData;
module.exports.resetUserData = resetUserData;
module.exports.userLog = userLog;
