/**
 * 修复控制器文件中的仓库引用
 * 将AppDataSource.getRepository替换为getConnection().getRepository
 */
const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src/controllers');

// 读取控制器目录中的所有文件
fs.readdir(controllersDir, (err, files) => {
  if (err) {
    console.error('读取目录失败:', err);
    return;
  }

  // 过滤出.js文件
  const jsFiles = files.filter(file => file.endsWith('.js'));

  // 处理每个控制器文件
  jsFiles.forEach(file => {
    const filePath = path.join(controllersDir, file);
    
    // 读取文件内容
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(`读取文件 ${file} 失败:`, err);
        return;
      }

      // 替换导入语句
      let newContent = data.replace(
        /const\s+\{\s*AppDataSource\s*\}\s*=\s*require\(['"]\.\.\/config\/database['"]\);/g,
        "const { getConnection } = require('typeorm');"
      );

      // 提取所有使用的实体名称
      const entityRegex = /const\s+\w+Repository\s*=\s*AppDataSource\.getRepository\(([\w]+)\);/g;
      const entities = new Set();
      let match;
      
      while ((match = entityRegex.exec(data)) !== null) {
        entities.add(match[1]);
      }

      // 为每个实体创建获取仓库的辅助函数
      entities.forEach(entity => {
        const repoVarName = entity.charAt(0).toLowerCase() + entity.slice(1) + 'Repository';
        const helperFuncName = 'get' + entity + 'Repository';
        
        // 替换仓库声明
        const repoDeclarationRegex = new RegExp(`const\\s+${repoVarName}\\s*=\\s*AppDataSource\\.getRepository\\(${entity}\\);`, 'g');
        
        newContent = newContent.replace(repoDeclarationRegex, 
          `// 获取${entity}仓库的辅助函数\n` +
          `const ${helperFuncName} = () => {\n` +
          `  return getConnection().getRepository(${entity});\n` +
          `};`
        );
        
        // 替换仓库使用
        newContent = newContent.replace(
          new RegExp(`${repoVarName}\\.`, 'g'),
          `${helperFuncName}().`
        );
      });

      // 写入修改后的内容
      fs.writeFile(filePath, newContent, 'utf8', (err) => {
        if (err) {
          console.error(`写入文件 ${file} 失败:`, err);
          return;
        }
        console.log(`成功修复文件: ${file}`);
      });
    });
  });
});

console.log('开始修复控制器文件...');