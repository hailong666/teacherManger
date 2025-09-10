const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Recitation',
  tableName: 'recitation',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    content: {
      type: 'text',
      nullable: true,
      comment: '学生提交的背诵内容（可选）'
    },
    article_id: {
      type: 'int',
      nullable: false,
      comment: '关联的课文ID'
    },
    student_id: {
      type: 'int',
      nullable: false
    },
    class_id: {
      type: 'int',
      nullable: false
    },
    audioUrl: {
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: '录音文件路径'
    },
    feedback: {
      type: 'text',
      nullable: true,
      comment: '教师反馈'
    },
    score: {
      type: 'tinyint',
      nullable: true,
      comment: '评分'
    },
    status: {
      type: 'enum',
      enum: ['pending', 'graded'],
      default: 'pending'
    },
    createdAt: {
      type: 'timestamp',
      createDate: true
    },
    updatedAt: {
      type: 'timestamp',
      updateDate: true
    },
    gradedAt: {
      type: 'timestamp',
      nullable: true
    },
    gradedBy: {
      type: 'int',
      nullable: true
    }
  },
  relations: {
    student: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'student_id'
      },
      onDelete: 'CASCADE'
    },
    class: {
      type: 'many-to-one',
      target: 'Class',
      joinColumn: {
        name: 'class_id'
      },
      onDelete: 'CASCADE'
    },
    gradedBy: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'gradedBy'
      },
      onDelete: 'SET NULL'
    },
    article: {
      type: 'many-to-one',
      target: 'Article',
      joinColumn: {
        name: 'article_id'
      },
      onDelete: 'CASCADE'
    }
  },
  indices: [
    {
      name: 'idx_student_recitation',
      columns: ['student_id']
    },
    {
      name: 'idx_class_recitation',
      columns: ['class_id']
    }
  ],
  checks: [
    {
      expression: 'score BETWEEN 0 AND 100'
    }
  ]
});