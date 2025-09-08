const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Homework',
  tableName: 'homework',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    student_id: {
      type: 'int',
      nullable: false
    },
    class_id: {
      type: 'int',
      nullable: false
    },
    title: {
      type: 'varchar',
      length: 255,
      nullable: false
    },
    description: {
      type: 'text',
      nullable: true
    },
    file_path: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    mime_type: {
      type: 'varchar',
      length: 50,
      nullable: true
    },
    size: {
      type: 'bigint',
      nullable: true
    },
    status: {
      type: 'enum',
      enum: ['待批改', '已批改', '未提交'],
      default: '未提交'
    },
    score: {
      type: 'tinyint',
      nullable: true
    },
    comment: {
      type: 'text',
      nullable: true
    },
    submit_time: {
      type: 'timestamp',
      nullable: true
    },
    create_time: {
      type: 'timestamp',
      createDate: true
    },
    update_time: {
      type: 'timestamp',
      updateDate: true
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
    }
  },
  indices: [
    {
      name: 'idx_student_homework',
      columns: ['student_id']
    },
    {
      name: 'idx_class_homework',
      columns: ['class_id']
    },
    {
      name: 'idx_status_homework',
      columns: ['status']
    }
  ],
  checks: [
    {
      expression: 'size <= 10485760' // 10MB
    },
    {
      expression: 'score BETWEEN 0 AND 100'
    }
  ]
});