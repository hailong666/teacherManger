const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'RandomCall',
  tableName: 'random_calls',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
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
    student_ids: {
      type: 'text',
      nullable: false,
      comment: '学生ID列表(JSON格式)'
    },
    student_names: {
      type: 'text',
      nullable: false,
      comment: '学生姓名列表'
    },
    call_type: {
      type: 'varchar',
      length: 50,
      default: 'random',
      comment: '点名类型'
    },
    call_count: {
      type: 'int',
      nullable: false,
      comment: '点名人数'
    },
    session_id: {
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: '随机点名会话ID'
    },
    subject: {
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: '科目'
    },
    notes: {
      type: 'text',
      nullable: true,
      comment: '备注信息'
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
      name: 'idx_session_id',
      columns: ['session_id']
    },
    {
      name: 'idx_call_type',
      columns: ['call_type']
    }
  ]
});