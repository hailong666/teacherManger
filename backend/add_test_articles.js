const mysql = require('mysql2/promise');
require('dotenv').config();

// 测试课文数据
const testArticles = [
  {
    title: '静夜思',
    content: '床前明月光，疑是地上霜。举头望明月，低头思故乡。',
    author: '李白',
    category: '古诗词',
    difficulty_level: 'easy',
    grade_level: '高一',
    description: '李白的经典思乡诗，表达了诗人对故乡的深切思念。',
    tags: '思乡,月亮,经典',
    estimated_time: 5
  },
  {
    title: '春晓',
    content: '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。',
    author: '孟浩然',
    category: '古诗词',
    difficulty_level: 'easy',
    grade_level: '高一',
    description: '孟浩然的田园诗，描绘了春天早晨的美好景象。',
    tags: '春天,自然,田园',
    estimated_time: 5
  },
  {
    title: '登鹳雀楼',
    content: '白日依山尽，黄河入海流。欲穷千里目，更上一层楼。',
    author: '王之涣',
    category: '古诗词',
    difficulty_level: 'medium',
    grade_level: '高一',
    description: '王之涣的名篇，表达了积极向上的人生态度。',
    tags: '励志,哲理,登高',
    estimated_time: 8
  },
  {
    title: '望庐山瀑布',
    content: '日照香炉生紫烟，遥看瀑布挂前川。飞流直下三千尺，疑是银河落九天。',
    author: '李白',
    category: '古诗词',
    difficulty_level: 'medium',
    grade_level: '高一',
    description: '李白描写庐山瀑布的壮观景象，想象奇特，气势磅礴。',
    tags: '山水,瀑布,想象',
    estimated_time: 10
  },
  {
    title: '将进酒',
    content: '君不见，黄河之水天上来，奔流到海不复回。君不见，高堂明镜悲白发，朝如青丝暮成雪。人生得意须尽欢，莫使金樽空对月。天生我材必有用，千金散尽还复来。',
    author: '李白',
    category: '古诗词',
    difficulty_level: 'hard',
    grade_level: '高一',
    description: '李白的代表作之一，表达了诗人豪放不羁的性格和积极的人生态度。',
    tags: '豪放,人生,哲理',
    estimated_time: 15
  }
];

async function addTestArticles() {
  let connection;
  
  try {
    // 创建数据库连接
    connection = await mysql.createConnection({
      host: '123.249.87.129',
      port: 3306,
      user: 'root',
      password: 'jxj13140123',
      database: 'teacher_manager'
    });
    
    console.log('数据库连接成功');
    
    // 查找admin用户作为创建者
    const [adminRows] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      ['admin']
    );
    
    if (adminRows.length === 0) {
      console.log('未找到admin用户，使用默认ID 1');
    }
    
    const createdBy = adminRows.length > 0 ? adminRows[0].id : 1;
    
    // 检查是否已存在课文
    const [existingArticles] = await connection.execute(
      'SELECT COUNT(*) as count FROM articles'
    );
    
    console.log(`数据库中已存在 ${existingArticles[0].count} 篇课文`);
    
    // 显示现有课文
    const [articles] = await connection.execute(
      'SELECT id, title, author, category, difficulty_level FROM articles ORDER BY id'
    );
    
    console.log('\n=== 现有课文列表 ===');
    console.table(articles);
    
    // 检查是否已有我们要添加的课文
    const existingTitles = articles.map(a => a.title);
    const articlesToAdd = testArticles.filter(article => !existingTitles.includes(article.title));
    
    if (articlesToAdd.length === 0) {
      console.log('所有测试课文都已存在，无需添加');
      return;
    }
    
    console.log(`需要添加 ${articlesToAdd.length} 篇新课文`);
    
    console.log('开始添加测试课文...');
    
    // 添加测试课文
    for (const article of articlesToAdd) {
      const wordCount = article.content.replace(/\s/g, '').length;
      
      await connection.execute(
        `INSERT INTO articles (title, content, author, category, difficulty_level, grade_level, description, tags, word_count, estimated_time, created_by, updated_by, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())`,
        [
          article.title,
          article.content,
          article.author,
          article.category,
          article.difficulty_level,
          article.grade_level,
          article.description,
          article.tags,
          wordCount,
          article.estimated_time,
          createdBy,
          createdBy
        ]
      );
      
      console.log(`✓ 已添加课文: ${article.title} (${article.author})`);
    }
    
    // 查询添加后的课文列表
    const [finalArticles] = await connection.execute(
      'SELECT id, title, author, category, difficulty_level, word_count FROM articles ORDER BY id'
    );
    
    console.log('\n=== 课文添加完成 ===');
    console.table(finalArticles);
    
    console.log(`\n成功添加 ${testArticles.length} 篇测试课文！`);
    
  } catch (error) {
    console.error('添加测试课文失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 如果直接运行此文件，则执行添加
if (require.main === module) {
  addTestArticles().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

module.exports = { addTestArticles };