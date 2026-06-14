/**
 * 修改 gameData.bin 中敌人的属性，让敌人更肉
 * 用法: node modifyEnemyStats.js [倍率]
 * 默认倍率: 2.0 (敌人血量翻倍)
 *
 * 示例:
 *   node modifyEnemyStats.js        # 默认 2x 血量
 *   node modifyEnemyStats.js 1.5    # 1.5x 血量
 *   node modifyEnemyStats.js 3.0    # 3x 血量
 *   node modifyEnemyStats.js --reset # 恢复备份
 */

const fs = require("fs");
const path = require("path");

const BIN_PATH = path.join(__dirname, "public", "gameData", "gameData.bin");
const BACKUP_PATH = path.join(__dirname, "public", "gameData", "gameData.bin.backup");
const XOR_KEY = [104, 104, 115, 106]; // "hhsj"
const ZIP_PASSWORD = "No.1129754";

// 敌人属性倍率配置
const MULTIPLIERS = {
  maxPH: 2.0,    // 最大生命值 x2
  defense: 1.5,  // 防御 x1.5
  hurt: 1.0,     // 攻击力不变 (保持可玩性)
};

async function main() {
  const args = process.argv.slice(2);

  // --reset: 恢复备份
  if (args[0] === "--reset") {
    if (!fs.existsSync(BACKUP_PATH)) {
      console.log("❌ 没有找到备份文件: " + BACKUP_PATH);
      process.exit(1);
    }
    fs.copyFileSync(BACKUP_PATH, BIN_PATH);
    console.log("✅ 已从备份恢复 gameData.bin");
    process.exit(0);
  }

  // 自定义倍率
  const customMultiplier = parseFloat(args[0]);
  if (args[0] && (isNaN(customMultiplier) || customMultiplier <= 0)) {
    console.log("❌ 无效的倍率参数: " + args[0]);
    console.log("用法: node modifyEnemyStats.js [倍率]  例如: node modifyEnemyStats.js 2.0");
    process.exit(1);
  }

  if (customMultiplier) {
    MULTIPLIERS.maxPH = customMultiplier;
    MULTIPLIERS.defense = Math.min(customMultiplier, 1.5); // defense 上限 1.5x
  }

  console.log("🔧 敌人属性修改工具");
  console.log("==================================");
  console.log(`  最大生命值 (maxPH): ${MULTIPLIERS.maxPH}x`);
  console.log(`  防御力 (defense):   ${MULTIPLIERS.defense}x`);
  console.log(`  攻击力 (hurt):      ${MULTIPLIERS.hurt}x (不变)`);
  console.log("==================================\n");

  // 1. 创建备份
  if (!fs.existsSync(BACKUP_PATH)) {
    fs.copyFileSync(BIN_PATH, BACKUP_PATH);
    console.log("📦 已创建备份: gameData.bin.backup");
  } else {
    console.log("📦 使用已有备份 (未覆盖)");
  }

  // 2. 读取并解密
  console.log("📖 读取 gameData.bin...");
  const binBuffer = fs.readFileSync(BIN_PATH);

  // XOR 解密
  const decodedBuffer = Buffer.alloc(binBuffer.length);
  for (let i = 0; i < binBuffer.length; i++) {
    decodedBuffer[i] = binBuffer[i] ^ XOR_KEY[i % 4];
  }

  // 3. 解压 zip
  console.log("🔓 解压数据...");
  let json;
  try {
    json = await extractZip(decodedBuffer, ZIP_PASSWORD);
  } catch (err) {
    console.log("❌ 解压失败:", err.message);
    process.exit(1);
  }

  // 4. 修改敌人数据
  const roles = json.roles;
  if (!roles) {
    console.log("❌ 无法找到 roles 数据");
    process.exit(1);
  }

  let modifiedCount = 0;
  for (const [name, roleData] of Object.entries(roles)) {
    let modified = false;

    if (roleData.maxPH && MULTIPLIERS.maxPH !== 1.0) {
      const oldPH = roleData.maxPH;
      roleData.maxPH = Math.round(oldPH * MULTIPLIERS.maxPH);
      modified = true;
    }
    if (roleData.defense && MULTIPLIERS.defense !== 1.0) {
      const oldDef = roleData.defense;
      roleData.defense = Math.round(oldDef * MULTIPLIERS.defense);
      modified = true;
    }

    if (modified) {
      modifiedCount++;
      console.log(`  ✏️  ${name}: maxPH=${roleData.maxPH}, defense=${roleData.defense}`);
    }
  }

  if (modifiedCount === 0) {
    console.log("⚠️  没有角色被修改（可能倍率为 1.0）");
    process.exit(0);
  }

  console.log(`\n📝 共修改了 ${modifiedCount} 个角色\n`);

  // 5. 重新打包
  console.log("🔒 重新打包...");
  const newBin = await repackZip(json, ZIP_PASSWORD, XOR_KEY);

  // 6. 写入
  fs.writeFileSync(BIN_PATH, newBin);
  console.log("✅ gameData.bin 已更新!");
  console.log("\n💡 提示: 如需恢复原始数据，运行: node modifyEnemyStats.js --reset");
}

/**
 * 解压带密码的 zip，返回解析后的 JSON
 */
async function extractZip(zipBuffer, password) {
  // 使用 no-worker 版本，避免 Worker is not defined 错误
  require("./node_modules/@zip.js/zip.js/dist/zip-no-worker.min.js");
  const { ZipReader, BlobReader, TextWriter } = globalThis.zip;
  globalThis.zip.configure({ useWebWorkers: false });

  const blob = new Blob([zipBuffer]);
  const reader = new ZipReader(new BlobReader(blob), {
    filenameEncoding: "utf-8",
  });

  let jsonText = null;
  try {
    const entries = await reader.getEntries();
    if (entries.length === 0) {
      throw new Error("Zip 文件中没有条目");
    }
    const entry = entries[0];
    jsonText = await entry.getData(new TextWriter(), {
      password: password,
    });
  } finally {
    await reader.close();
  }

  if (!jsonText) {
    throw new Error("无法读取 zip 内容");
  }
  return JSON.parse(jsonText);
}

/**
 * 将 JSON 打包为加密的 zip buffer
 */
async function repackZip(json, password, xorKey) {
  const { ZipWriter, BlobWriter, TextReader } = globalThis.zip;

  const zipWriter = new ZipWriter(new BlobWriter("application/zip"));
  const jsonStr = JSON.stringify(json);

  await zipWriter.add("gameData.json", new TextReader(jsonStr), {
    bufferedWrite: true,
    password: password,
  });

  const zipBlob = await zipWriter.close();
  const arrayBuffer = await zipBlob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // XOR 加密
  const encoded = Buffer.alloc(uint8.length);
  for (let i = 0; i < uint8.length; i++) {
    encoded[i] = uint8[i] ^ xorKey[i % 4];
  }

  return encoded;
}

main().catch((err) => {
  console.error("❌ 错误:", err);
  process.exit(1);
});
