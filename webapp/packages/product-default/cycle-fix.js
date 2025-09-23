#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 需要临时修改的 tsconfig.json 文件路径（相对于 webapp 根目录）
const WEBAPP_ROOT = path.resolve(__dirname, '../..');
const TSCONFIG_PATHS = ['packages/plugin-data-viewer/tsconfig.json'];

// 需要临时移除的循环引用路径
const CIRCULAR_REFERENCES = ['../plugin-sql-editor', '../plugin-sql-editor-navigation-tab'];

// 备份文件后缀
const BACKUP_SUFFIX = '.backup-before-build';

/**
 * 备份并修改 tsconfig.json 文件，移除循环引用
 */
function removeCircularReferences() {
  console.log('🔧 正在移除循环引用...');

  TSCONFIG_PATHS.forEach(tsconfigPath => {
    const fullPath = path.join(WEBAPP_ROOT, tsconfigPath);
    const backupPath = fullPath + BACKUP_SUFFIX;

    try {
      // 检查是否已存在备份文件
      if (fs.existsSync(backupPath)) {
        console.log(`⚠️  备份文件已存在: ${tsconfigPath}${BACKUP_SUFFIX}`);
        return;
      }

      // 读取原始文件
      const originalContent = fs.readFileSync(fullPath, 'utf8');

      // 创建备份
      fs.writeFileSync(backupPath, originalContent);
      console.log(`📝 已备份: ${tsconfigPath}`);

      // 解析 JSON
      const tsconfig = JSON.parse(originalContent);

      // 移除循环引用
      if (tsconfig.references) {
        const originalCount = tsconfig.references.length;
        tsconfig.references = tsconfig.references.filter(ref => !CIRCULAR_REFERENCES.includes(ref.path));
        const removedCount = originalCount - tsconfig.references.length;

        if (removedCount > 0) {
          console.log(`🗑️  已从 ${tsconfigPath} 移除 ${removedCount} 个循环引用`);

          // 写入修改后的内容
          fs.writeFileSync(fullPath, JSON.stringify(tsconfig, null, 2) + '\n');
        } else {
          console.log(`ℹ️  ${tsconfigPath} 中未找到需要移除的循环引用`);
        }
      }
    } catch (error) {
      console.error(`❌ 处理 ${tsconfigPath} 时出错:`, error.message);
      throw error;
    }
  });
}

/**
 * 恢复备份的 tsconfig.json 文件
 */
function restoreBackups() {
  console.log('🔄 正在恢复备份文件...');

  TSCONFIG_PATHS.forEach(tsconfigPath => {
    const fullPath = path.join(WEBAPP_ROOT, tsconfigPath);
    const backupPath = fullPath + BACKUP_SUFFIX;

    try {
      if (fs.existsSync(backupPath)) {
        // 恢复备份
        fs.copyFileSync(backupPath, fullPath);

        // 删除备份文件
        fs.unlinkSync(backupPath);

        console.log(`✅ 已恢复: ${tsconfigPath}`);
      } else {
        console.log(`ℹ️  未找到备份文件: ${tsconfigPath}${BACKUP_SUFFIX}`);
      }
    } catch (error) {
      console.error(`❌ 恢复 ${tsconfigPath} 时出错:`, error.message);
    }
  });
}

/**
 * 清理备份文件（用于异常情况）
 */
function cleanupBackups() {
  console.log('🧹 清理备份文件...');

  TSCONFIG_PATHS.forEach(tsconfigPath => {
    const fullPath = path.join(WEBAPP_ROOT, tsconfigPath);
    const backupPath = fullPath + BACKUP_SUFFIX;

    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      console.log(`🧹 已清理备份文件: ${tsconfigPath}${BACKUP_SUFFIX}`);
    }
  });
}

// 处理进程中断信号
process.on('SIGINT', () => {
  console.log('\n\n⚠️  收到中断信号，正在清理...');
  restoreBackups();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  收到终止信号，正在清理...');
  restoreBackups();
  process.exit(0);
});

// 命令行参数处理
const command = process.argv[2];

switch (command) {
  case 'remove':
    console.log('🚀 开始移除循环引用...\n');
    try {
      removeCircularReferences();
      console.log('\n✅ 循环引用移除完成！');
    } catch (error) {
      console.error('\n❌ 移除循环引用失败:', error.message);
      process.exit(1);
    }
    break;

  case 'restore':
    console.log('🚀 开始恢复备份文件...\n');
    try {
      restoreBackups();
      console.log('\n✅ 备份恢复完成！');
    } catch (error) {
      console.error('\n❌ 恢复备份失败:', error.message);
      process.exit(1);
    }
    break;

  case 'cleanup':
    cleanupBackups();
    console.log('✅ 清理完成！');
    break;

  default:
    console.log(`
用法: node cycle-fix.js <command>

命令:
  remove   - 移除循环引用（创建备份）
  restore  - 恢复备份文件
  cleanup  - 清理备份文件

示例:
  node cycle-fix.js remove   # 移除循环引用
  yarn build                 # 执行构建
  node cycle-fix.js restore  # 恢复原始文件
`);
    process.exit(1);
}
