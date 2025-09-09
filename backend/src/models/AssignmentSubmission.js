const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'AssignmentSubmission',
  tableName: 'assignment_submissions',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    assignment_id: {
      type: 'int',
      nullable: false,
      comment: '作业ID'
    },
    student_id: {
      type: 'int',
      nullable: false,
      comment: '学生ID'
    },
    content: {
      type: 'text',
      nullable: true,
      comment: '提交内容'
    },
    attachments: {
      type: 'text',
      nullable: true,
      comment: '附件路径（JSON格式）'
    },
    submission_time: {
      type: 'timestamp',
      nullable: false,
      comment: '提交时间'
    },
    is_late: {
      type: 'boolean',
      default: false,
      comment: '是否迟交'
    },
    status: {
      type: 'enum',
      enum: ['submitted', 'graded', 'returned', 'resubmitted'],
      default: 'submitted',
      comment: '状态'
    },
    score: {
      type: 'decimal',
      precision: 5,
      scale: 2,
      nullable: true,
      comment: '得分'
    },
    grade: {
      type: 'varchar',
      length: 10,
      nullable: true,
      comment: '等级（A、B、C、D、F）'
    },
    feedback: {
      type: 'text',
      nullable: true,
      comment: '教师反馈'
    },
    graded_by: {
      type: 'int',
      nullable: true,
      comment: '评分教师ID'
    },
    graded_at: {
      type: 'timestamp',
      nullable: true,
      comment: '评分时间'
    },
    attempt_number: {
      type: 'int',
      default: 1,
      comment: '提交次数'
    },
    plagiarism_score: {
      type: 'decimal',
      precision: 5,
      scale: 2,
      nullable: true,
      comment: '查重分数'
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
    assignment: {
      type: 'many-to-one',
      target: 'Assignment',
      joinColumn: {
        name: 'assignment_id'
      }
    },
    student: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'student_id'
      }
    },
    grader: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'graded_by'
      }
    }
  },
  indices: [
    {
      name: 'idx_assignment_id',
      columns: ['assignment_id']
    },
    {
      name: 'idx_student_id',
      columns: ['student_id']
    },
    {
      name: 'idx_submission_time',
      columns: ['submission_time']
    },
    {
      name: 'idx_status',
      columns: ['status']
    },
    {
      name: 'idx_graded_by',
      columns: ['graded_by']
    }
  ],
  uniques: [
    {
      name: 'unique_assignment_student_attempt',
      columns: ['assignment_id', 'student_id', 'attempt_number']
    }
  ]
});