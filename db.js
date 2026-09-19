const path = require('path');
const Database = require('better-sqlite3');

const dataDir = process.env.DATA_DIR || __dirname;
const db = new Database(path.join(dataDir, 'store.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
    category    TEXT NOT NULL,
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    total_cents      INTEGER NOT NULL,
    status           TEXT NOT NULL DEFAULT 'placed',
    shipping_name    TEXT NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_city    TEXT NOT NULL,
    shipping_zip     TEXT NOT NULL,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id         INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id       INTEGER NOT NULL REFERENCES products(id),
    name             TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    quantity         INTEGER NOT NULL CHECK (quantity > 0)
  );

  CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
  CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_id);
`);

const SEED_PRODUCTS = [
  ['ESP32 Dev Board', 'Dual-core Wi-Fi and Bluetooth microcontroller board with 30 broken-out pins. Good for IoT prototypes.', 899, 'Boards', 40],
  ['Arduino-style Uno R3', 'ATmega328P board with USB cable. The standard first board for learning embedded programming.', 1299, 'Boards', 35],
  ['Raspberry Pi Pico', 'RP2040 microcontroller with 26 GPIO pins. Programs in MicroPython or C.', 499, 'Boards', 60],
  ['Ultrasonic Distance Sensor', 'Measures 2 cm to 4 m using sound. Works at 5 V, four pins.', 349, 'Sensors', 80],
  ['DHT22 Temperature & Humidity Sensor', 'Digital sensor with 0.5 °C accuracy. Single-wire interface.', 599, 'Sensors', 55],
  ['PIR Motion Sensor', 'Passive infrared sensor with adjustable range and delay. Detects movement up to 7 m.', 279, 'Sensors', 70],
  ['MPU6050 Accelerometer + Gyro', '6-axis motion tracking over I2C. Useful for balancing robots and gesture input.', 449, 'Sensors', 45],
  ['SG90 Micro Servo', '9 g servo with 180° range. Includes horns and screws.', 249, 'Motors', 100],
  ['N20 Geared Motor (2 pack)', '6 V metal-gear DC motors, 100 RPM. Compact enough for small robot chassis.', 799, 'Motors', 30],
  ['L298N Motor Driver', 'Dual H-bridge driver for two DC motors or one stepper. Up to 2 A per channel.', 399, 'Motors', 50],
  ['0.96" OLED Display', '128×64 monochrome display over I2C. Sharp text and simple graphics at low power.', 549, 'Displays', 65],
  ['16×2 LCD with I2C Backpack', 'Character display with a backpack that cuts wiring to four pins.', 429, 'Displays', 48],
  ['Breadboard 830 Points', 'Full-size solderless breadboard with two power rails on each side.', 349, 'Kits & Wiring', 90],
  ['Jumper Wire Set (120 pcs)', 'Male-male, male-female and female-female jumpers in assorted lengths.', 599, 'Kits & Wiring', 75],
  ['Starter Electronics Kit', 'Resistors, LEDs, buttons, potentiometers, buzzer and a storage case. Enough for first ten projects.', 2499, 'Kits & Wiring', 20],
  ['Soldering Iron Kit', 'Adjustable-temperature iron, stand, solder and tip cleaner.', 2899, 'Tools', 15]
];

function seed() {
  const insert = db.prepare(
    'INSERT INTO products (name, description, price_cents, category, stock) VALUES (?, ?, ?, ?, ?)'
  );
  db.transaction(() => SEED_PRODUCTS.forEach(p => insert.run(...p)))();
}

const count = db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
if (count === 0) seed();

// `npm run reseed` resets the product catalogue (users and orders are kept
// only if no order references a product, so this clears orders too).
if (require.main === module && process.argv.includes('--reseed')) {
  db.transaction(() => {
    db.exec('DELETE FROM order_items; DELETE FROM orders; DELETE FROM products;');
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('products','orders','order_items');");
    seed();
  })();
  console.log('Products reseeded (orders cleared).');
}

module.exports = db;
