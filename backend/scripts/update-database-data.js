const mysql = require('mysql2/promise');
require('dotenv').config();
const bcrypt = require('bcrypt');

async function updateDatabaseData() {
  let connection;
  
  try {
    // 连接数据库
    const connection = await mysql.createConnection({
       host: '123.249.87.129',
       port: 3306,
       user: 'teacher_admin',
       password: 'jxj13140123',
       database: 'teacher_manager'
     });
    
    console.log('数据库连接成功');
    
    // 生成密码哈希 (123456)
    const passwordHash = await bcrypt.hash('123456', 10);
    console.log('密码哈希生成完成');
    
    // 1. 创建杨老师账户
    console.log('\n=== 1. 创建杨老师账户 ===');
    const [teacherResult] = await connection.execute(`
      INSERT INTO users (username, password, name, role_id, email, gender, status, created_at, updated_at) 
      VALUES ('teacher1', ?, '杨老师', 2, 'yang@teacher.com', 'female', 'active', NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
      password = VALUES(password),
      name = VALUES(name),
      email = VALUES(email),
      gender = VALUES(gender),
      updated_at = NOW()
    `, [passwordHash]);
    
    // 获取杨老师的ID
    const [yangTeacher] = await connection.execute('SELECT id FROM users WHERE username = "teacher1"');
    const yangTeacherId = yangTeacher[0].id;
    console.log(`杨老师账户创建/更新完成，ID: ${yangTeacherId}`);
    
    // 2. 创建高一4班
    console.log('\n=== 2. 创建高一4班 ===');
    await connection.execute(`
      INSERT INTO classes (name, description, teacher_id, grade, semester, academic_year, status, created_at, updated_at)
      VALUES ('高一4班', '高一年级第4班', ?, '高一', '1', '2024-2025', 'active', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
      teacher_id = VALUES(teacher_id),
      description = VALUES(description),
      updated_at = NOW()
    `, [yangTeacherId]);
    
    // 获取班级ID
    const [classResult] = await connection.execute('SELECT id FROM classes WHERE name = "高一4班"');
    const classId = classResult[0].id;
    console.log(`高一4班创建/更新完成，ID: ${classId}`);
    
    // 3. 添加高一4班学生数据
    console.log('\n=== 3. 添加高一4班学生数据 ===');
    const students = [
      { studentId: '202501', name: '刘轩玮', gender: 'male' },
      { studentId: '202502', name: '滕紫瑜', gender: 'male' },
      { studentId: '202503', name: '陈禹汐', gender: 'female' },
      { studentId: '202504', name: '王艺潼', gender: 'female' },
      { studentId: '202505', name: '李佳怡', gender: 'female' },
      { studentId: '202506', name: '罗泽熹', gender: 'male' },
      { studentId: '202507', name: '郭梓鑫', gender: 'male' },
      { studentId: '202508', name: '孙琮傲', gender: 'male' },
      { studentId: '202509', name: '付莹滢', gender: 'female' },
      { studentId: '202510', name: '刘雨晴', gender: 'female' },
      { studentId: '202511', name: '张煜堃', gender: 'male' },
      { studentId: '202512', name: '金梦萱', gender: 'female' },
      { studentId: '202513', name: '魏伊姝', gender: 'female' },
      { studentId: '202514', name: '李佳隆', gender: 'male' },
      { studentId: '202515', name: '金子豪', gender: 'male' },
      { studentId: '202516', name: '石梓萱', gender: 'female' },
      { studentId: '202517', name: '刘石蕾', gender: 'female' },
      { studentId: '202518', name: '李兴', gender: 'male' },
      { studentId: '202519', name: '王梓銮', gender: 'female' },
      { studentId: '202520', name: '吴绮瑶', gender: 'female' },
      { studentId: '202521', name: '刘敬易', gender: 'male' },
      { studentId: '202522', name: '曹露予', gender: 'female' },
      { studentId: '202523', name: '张辰雨', gender: 'female' },
      { studentId: '202524', name: '沈逸轩', gender: 'male' },
      { studentId: '202525', name: '冯梓航', gender: 'male' },
      { studentId: '202526', name: '吕迪', gender: 'female' },
      { studentId: '202527', name: '周恒旭', gender: 'male' },
      { studentId: '202528', name: '郭玥希', gender: 'female' },
      { studentId: '202529', name: '朱棋枫', gender: 'female' },
      { studentId: '202530', name: '贾泽轩', gender: 'male' },
      { studentId: '202531', name: '李承旭', gender: 'male' },
      { studentId: '202532', name: '宋雨泽', gender: 'male' },
      { studentId: '202533', name: '于震灏', gender: 'male' },
      { studentId: '202534', name: '刘思琪', gender: 'female' },
      { studentId: '202535', name: '胡伦嘉', gender: 'male' },
      { studentId: '202536', name: '王娅琳', gender: 'female' },
      { studentId: '202537', name: '东雨萱', gender: 'female' },
      { studentId: '202538', name: '李欣怡', gender: 'female' },
      { studentId: '202539', name: '陈达尔汉', gender: 'male' }
    ];
    
    const studentUserIds = [];
    
    for (const student of students) {
      // 插入学生用户
      await connection.execute(`
        INSERT INTO users (username, password, name, role_id, email, gender, status, created_at, updated_at)
        VALUES (?, ?, ?, 3, ?, ?, 'active', NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        password = VALUES(password),
        name = VALUES(name),
        email = VALUES(email),
        gender = VALUES(gender),
        updated_at = NOW()
      `, [student.studentId, passwordHash, student.name, `${student.studentId}@student.com`, student.gender]);
      
      // 获取学生用户ID
      const [userResult] = await connection.execute('SELECT id FROM users WHERE username = ?', [student.studentId]);
      const userId = userResult[0].id;
      studentUserIds.push(userId);
      
      console.log(`学生 ${student.name} (${student.studentId}) 创建/更新完成，ID: ${userId}`);
    }
    
    // 4. 将学生分配到班级
    console.log('\n=== 4. 将学生分配到班级 ===');
    for (const userId of studentUserIds) {
      await connection.execute(`
        INSERT INTO class_students (class_id, student_id, status, join_date)
        VALUES (?, ?, 'active', NOW())
        ON DUPLICATE KEY UPDATE
        status = 'active',
        join_date = NOW()
      `, [classId, userId]);
    }
    console.log(`${studentUserIds.length} 名学生已分配到高一4班`);
    
    // 5. 添加课文数据
    console.log('\n=== 5. 添加课文数据 ===');
    const articles = [
      // 诗歌类
      { title: '沁园春·长沙', category: '诗歌', content: '独立寒秋，湘江北去，橘子洲头。看万山红遍，层林尽染；漫江碧透，百舸争流。鹰击长空，鱼翔浅底，万类霜天竞自由。怅寥廓，问苍茫大地，谁主沉浮？\n\n携来百侣曾游，忆往昔峥嵘岁月稠。恰同学少年，风华正茂；书生意气，挥斥方遒。指点江山，激扬文字，粪土当年万户侯。曾记否，到中流击水，浪遏飞舟？', author: '毛泽东' },
      { title: '短歌行', category: '诗歌', content: '对酒当歌，人生几何！譬如朝露，去日苦多。慨当以慷，忧思难忘。何以解忧？唯有杜康。\n\n青青子衿，悠悠我心。但为君故，沉吟至今。呦呦鹿鸣，食野之苹。我有嘉宾，鼓瑟吹笙。\n\n明明如月，何时可掇？忧从中来，不可断绝。越陌度阡，枉用相存。契阔谈讌，心念旧恩。\n\n月明星稀，乌鹊南飞。绕树三匝，何枝可依？山不厌高，海不厌深。周公吐哺，天下归心。', author: '曹操' },
      { title: '归园田居', category: '诗歌', content: '少无适俗韵，性本爱丘山。误落尘网中，一去三十年。\n羁鸟恋旧林，池鱼思故渊。开荒南野际，守拙归园田。\n方宅十余亩，草屋八九间。榆柳荫后檐，桃李罗堂前。\n暧暧远人村，依依墟里烟。狗吠深巷中，鸡鸣桑树颠。\n户庭无尘杂，虚室有余闲。久在樊笼里，复得返自然。', author: '陶渊明' },
      { title: '梦游天姥吟留别', category: '诗歌', content: '海客谈瀛洲，烟涛微茫信难求；越人语天姥，云霞明灭或可睹。天姥连天向天横，势拔五岳掩赤城。天台四万八千丈，对此欲倒东南倾。\n\n我欲因之梦吴越，一夜飞度镜湖月。湖月照我影，送我至剡溪。谢公宿处今尚在，渌水荡漾清猿啼。脚著谢公屐，身登青云梯。半壁见海日，空中闻天鸡。千岩万转路不定，迷花倚石忽已暝。熊咆龙吟殷岩泉，栗深林兮惊层巅。云青青兮欲雨，水澹澹兮生烟。列缺霹雳，丘峦崩摧。洞天石扉，訇然中开。青冥浩荡不见底，日月照耀金银台。霓为衣兮风为马，云之君兮纷纷而来下。虎鼓瑟兮鸾回车，仙之人兮列如麻。忽魂悸以魄动，恍惊起而长嗟。惟觉时之枕席，失向来之烟霞。\n\n世间行乐亦如此，古来万事东流水。别君去兮何时还？且放白鹿青崖间，须行即骑访名山。安能摧眉折腰事权贵，使我不得开心颜！', author: '李白' },
      { title: '登高', category: '诗歌', content: '风急天高猿啸哀，渚清沙白鸟飞回。\n无边落木萧萧下，不尽长江滚滚来。\n万里悲秋常作客，百年多病独登台。\n艰难苦恨繁霜鬓，潦倒新停浊酒杯。', author: '杜甫' },
      { title: '琵琶行', category: '诗歌', content: '浔阳江头夜送客，枫叶荻花秋瑟瑟。主人下马客在船，举酒欲饮无管弦。醉不成欢惨将别，别时茫茫江浸月。\n\n忽闻水上琵琶声，主人忘归客不发。寻声暗问弹者谁？琵琶声停欲语迟。移船相近邀相见，添酒回灯重开宴。千呼万唤始出来，犹抱琵琶半遮面。转轴拨弦三两声，未成曲调先有情。弦弦掩抑声声思，似诉平生不得志。低眉信手续续弹，说尽心中无限事。', author: '白居易' },
      { title: '念奴娇·赤壁怀古', category: '诗歌', content: '大江东去，浪淘尽，千古风流人物。故垒西边，人道是，三国周郎赤壁。乱石穿空，惊涛拍岸，卷起千堆雪。江山如画，一时多少豪杰。\n\n遥想公瑾当年，小乔初嫁了，雄姿英发。羽扇纶巾，谈笑间，樯橹灰飞烟灭。故国神游，多情应笑我，早生华发。人生如梦，一尊还酹江月。', author: '苏轼' },
      { title: '永遇乐·京口北固亭怀古', category: '诗歌', content: '千古江山，英雄无觅，孙仲谋处。舞榭歌台，风流总被，雨打风吹去。斜阳草树，寻常巷陌，人道寄奴曾住。想当年，金戈铁马，气吞万里如虎。\n\n元嘉草草，封狼居胥，赢得仓皇北顾。四十三年，望中犹记，烽火扬州路。可堪回首，佛狸祠下，一片神鸦社鼓。凭谁问，廉颇老矣，尚能饭否？', author: '辛弃疾' },
      { title: '声声慢', category: '诗歌', content: '寻寻觅觅，冷冷清清，凄凄惨惨戚戚。乍暖还寒时候，最难将息。三杯两盏淡酒，怎敌他、晚来风急？雁过也，正伤心，却是旧时相识。\n\n满地黄花堆积。憔悴损，如今有谁堪摘？守着窗儿，独自怎生得黑？梧桐更兼细雨，到黄昏、点点滴滴。这次第，怎一个愁字了得！', author: '李清照' },
      { title: '静女', category: '诗歌', content: '静女其姝，俟我于城隅。爱而不见，搔首踟蹰。\n静女其娈，贻我彤管。彤管有炜，说怿女美。\n自牧归荑，洵美且异。匪女之为美，美人之贻。', author: '诗经' },
      { title: '涉江采芙蓉', category: '诗歌', content: '涉江采芙蓉，兰泽多芳草。\n采之欲遗谁？所思在远道。\n还顾望旧乡，长路漫浩浩。\n同心而离居，忧伤以终老。', author: '古诗十九首' },
      { title: '虞美人', category: '诗歌', content: '春花秋月何时了？往事知多少。小楼昨夜又东风，故国不堪回首月明中。\n\n雕栏玉砌应犹在，只是朱颜改。问君能有几多愁？恰似一江春水向东流。', author: '李煜' },
      { title: '鹊桥仙', category: '诗歌', content: '纤云弄巧，飞星传恨，银汉迢迢暗度。金风玉露一相逢，便胜却人间无数。\n\n柔情似水，佳期如梦，忍顾鹊桥归路。两情若是久长时，又岂在朝朝暮暮。', author: '秦观' },
      // 文言文类
      { title: '劝学', category: '文言文', content: '君子曰：学不可以已。\n\n青，取之于蓝，而青于蓝；冰，水为之，而寒于水。木直中绳，輮以为轮，其曲中规。虽有槁暴，不复挺者，輮使之然也。故木受绳则直，金就砺则利，君子博学而日参省乎己，则知明而行无过矣。\n\n吾尝终日而思矣，不如须臾之所学也；吾尝跂而望矣，不如登高之博见也。登高而招，臂非加长也，而见者远；顺风而呼，声非加疾也，而闻者彰。假舆马者，非利足也，而致千里；假舟楫者，非能水也，而绝江河。君子生非异也，善假于物也。', author: '荀子' },
      { title: '师说', category: '文言文', content: '古之学者必有师。师者，所以传道受业解惑也。人非生而知之者，孰能无惑？惑而不从师，其为惑也，终不解矣。\n\n生乎吾前，其闻道也固先乎吾，吾从而师之；生乎吾后，其闻道也亦先乎吾，吾从而师之。吾师道也，夫庸知其年之先后生于吾乎？是故无贵无贱，无长无少，道之所存，师之所存也。\n\n嗟乎！师道之不传也久矣！欲人之无惑也难矣！古之圣人，其出人也远矣，犹且从师而问焉；今之众人，其下圣人也亦远矣，而耻学于师。是故圣益圣，愚益愚。圣人之所以为圣，愚人之所以为愚，其皆出于此乎？', author: '韩愈' },
      { title: '赤壁赋', category: '文言文', content: '壬戌之秋，七月既望，苏子与客泛舟游于赤壁之下。清风徐来，水波不兴。举酒属客，诵明月之诗，歌窈窕之章。少焉，月出于东山之上，徘徊于斗牛之间。白露横江，水光接天。纵一苇之所如，凌万顷之茫然。浩浩乎如冯虚御风，而不知其所止；飘飘乎如遗世独立，羽化而登仙。\n\n于是饮酒乐甚，扣舷而歌之。歌曰："桂棹兮兰桨，击空明兮溯流光。渺渺兮予怀，望美人兮天一方。"客有吹洞箫者，倚歌而和之。其声呜呜然，如怨如慕，如泣如诉，余音袅袅，不绝如缕。舞幽壑之潜蛟，泣孤舟之嫠妇。', author: '苏轼' }
    ];
    
    for (const article of articles) {
      await connection.execute(`
        INSERT INTO articles (title, content, author, category, status, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', 1, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        content = VALUES(content),
        author = VALUES(author),
        category = VALUES(category),
        updated_at = NOW()
      `, [article.title, article.content, article.author, article.category]);
      
      console.log(`课文《${article.title}》添加/更新完成`);
    }
    
    console.log(`${articles.length} 篇课文添加/更新完成`);
    
    // 6. 清理多余的教师账户，只保留admin和teacher1
    console.log('\n=== 6. 清理多余的教师账户 ===');
    
    // 删除除了admin和teacher1之外的其他用户
    const [deleteResult] = await connection.execute(`
      DELETE FROM users 
      WHERE username NOT IN ('admin', 'teacher1') 
      AND username NOT LIKE '2025%'
    `);
    
    console.log(`已删除 ${deleteResult.affectedRows} 个多余的用户账户`);
    
    // 7. 更新admin和teacher1的密码为123456
    console.log('\n=== 7. 更新管理员和教师密码 ===');
    
    await connection.execute(`
      UPDATE users 
      SET password = ?, updated_at = NOW()
      WHERE username IN ('admin', 'teacher1')
    `, [passwordHash]);
    
    console.log('admin和teacher1的密码已更新为123456');
    
    // 8. 显示最终统计信息
    console.log('\n=== 8. 最终统计信息 ===');
    
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    const [studentCount] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role_id = 3');
    const [teacherCount] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE role_id = 2');
    const [classCount] = await connection.execute('SELECT COUNT(*) as count FROM classes');
    const [articleCount] = await connection.execute('SELECT COUNT(*) as count FROM articles');
    const [classStudentCount] = await connection.execute('SELECT COUNT(*) as count FROM class_students WHERE class_id = ?', [classId]);
    
    console.log(`总用户数: ${userCount[0].count}`);
    console.log(`学生数: ${studentCount[0].count}`);
    console.log(`教师数: ${teacherCount[0].count}`);
    console.log(`班级数: ${classCount[0].count}`);
    console.log(`课文数: ${articleCount[0].count}`);
    console.log(`高一4班学生数: ${classStudentCount[0].count}`);
    
    console.log('\n✅ 数据库数据更新完成！');
    console.log('\n📋 账户信息:');
    console.log('- 管理员: admin / 123456');
    console.log('- 教师: teacher1 (杨老师) / 123456');
    console.log('- 学生: 学号作为用户名 / 123456');
    
  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n数据库连接已关闭');
    }
  }
}

updateDatabaseData();