const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Assignment',
  tableName: 'assignments',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    title: {
      type: 'varchar',
      length: 200,
      nullable: false,
      comment: '作业标题'
    },
    description: {
      type: 'text',
      nullable: true,
      comment: '作业描述'
    },
    class_id: {
      type: 'int',
      nullable: false,
      comment: '班级ID'
    },
    teacher_id: {
      type: 'int',
      nullable: false,
      comment: '教师ID'
    },
    subject: {
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: '科目'
    },
    type: {
      type: 'enum',
      enum: ['homework', 'quiz', 'exam', 'project'],
      default: 'homework',
      comment: '作业类型'
    },
    difficulty: {
      type: 'enum',
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
      comment: '难度等级'
    },
    due_date: {
      type: 'datetime',
      nullable: false,
      comment: '截止时间'
    },
    start_date: {
      type: 'datetime',
      nullable: true,
      comment: '开始时间'
    },
    max_score: {
      type: 'int',
      default: 100,
      comment: '满分'
    },
    pass_score: {
      type: 'int',
      default: 60,
      comment: '及格分'
    },
    allow_late_submission: {
      type: 'boolean',
      default: false,
      comment: '是否允许迟交'
    },
    late_penalty: {
      type: 'decimal',
      precision: 5,
      scale: 2,
      default: 0,
      comment: '迟交扣分比例'
    },
    instructions: {
      type: 'text',
      nullable: true,
      comment: '作业说明'
    },
    attachments: {
      type: 'text',
      nullable: true,
      comment: '附件路径（JSON格式）'
    },
    status: {
      type: 'enum',
      enum: ['draft', 'published', 'closed', 'graded'],
      default: 'draft',
      comment: '状态'
    },
    auto_grade: {
      type: 'boolean',
      default: false,
      comment: '是否自动评分'
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
    class: {
      type: 'many-to-one',
      target: 'Class',
      joinColumn: {
        name: 'class_id'
      }
    },
    teacher: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'teacher_id'
      }
    },
    submissions: {
      type: 'one-to-many',
      target: 'AssignmentSubmission',
      inverseSide: 'assignment'
    }
  },
  indices: [
    {
      name: 'idx_class_id',
      columns: ['class_id']
    },
    {
      name: 'idx_teacher_id',
      columns: ['teacher_id']
    },
    {
      name: 'idx_due_date',
      columns: ['due_date']
    },
    {
      name: 'idx_status',
      columns: ['status']
    },
    {
      name: 'idx_type',
      columns: ['type']
    }
  ]
});