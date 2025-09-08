const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'RandomCall',
  tableName: 'random_call',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    class_id: {
      type: 'int',
      nullable: false
    },
    teacher_id: {
      type: 'int',
      nullable: false
    },
    student_ids: {
      type: 'text',
      nullable: false,
      comment: 'JSON格式存储被点名学生ID列表'
    },
    student_names: {
      type: 'text',
      nullable: false,
      comment: '被点名学生姓名，逗号分隔'
    },
    call_type: {
      type: 'varchar',
      length: 50,
      default: 'random',
      comment: '点名类型：random-随机点名'
    },
    call_count: {
      type: 'int',
      default: 1,
      comment: '点名人数'
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
      },
      onDelete: 'CASCADE'
    },
    teacher: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'teacher_id'
      },
      onDelete: 'CASCADE'
    }
  },
  indices: [
    {
      name: 'idx_class_teacher',
      columns: ['class_id', 'teacher_id']
    },
    {
      name: 'idx_created_at',
      columns: ['created_at']
    }
  ]
});