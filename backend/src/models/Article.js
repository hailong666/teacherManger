const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Article',
  tableName: 'articles',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    title: {
      type: 'varchar',
      length: 255,
      nullable: false,
      comment: '课文标题'
    },
    content: {
      type: 'text',
      nullable: false,
      comment: '课文内容'
    },
    author: {
      type: 'varchar',
      length: 100,
      nullable: true,
      comment: '作者'
    },
    category: {
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: '分类（如：古诗词、现代文、文言文等）'
    },
    difficulty_level: {
      type: 'enum',
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      comment: '难度等级'
    },
    grade_level: {
      type: 'varchar',
      length: 20,
      nullable: true,
      comment: '适用年级'
    },
    description: {
      type: 'text',
      nullable: true,
      comment: '课文描述或背景介绍'
    },
    tags: {
      type: 'varchar',
      length: 500,
      nullable: true,
      comment: '标签，用逗号分隔'
    },
    word_count: {
      type: 'int',
      nullable: true,
      comment: '字数统计'
    },
    estimated_time: {
      type: 'int',
      nullable: true,
      comment: '预计背诵时间（分钟）'
    },
    status: {
      type: 'enum',
      enum: ['active', 'inactive', 'draft'],
      default: 'active',
      comment: '状态'
    },
    created_by: {
      type: 'int',
      nullable: false,
      comment: '创建者ID'
    },
    updated_by: {
      type: 'int',
      nullable: true,
      comment: '最后更新者ID'
    },
    created_at: {
      type: 'timestamp',
      createDate: true
    },
    updated_at: {
      type: 'timestamp',
      updateDate: true
    }
  },
  relations: {
    creator: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'created_by'
      }
    },
    updater: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'updated_by'
      }
    },
    recitations: {
      type: 'one-to-many',
      target: 'Recitation',
      inverseSide: 'article'
    }
  },
  indices: [
    {
      name: 'idx_category',
      columns: ['category']
    },
    {
      name: 'idx_difficulty_level',
      columns: ['difficulty_level']
    },
    {
      name: 'idx_grade_level',
      columns: ['grade_level']
    },
    {
      name: 'idx_status',
      columns: ['status']
    },
    {
      name: 'idx_created_by',
      columns: ['created_by']
    }
  ]
});