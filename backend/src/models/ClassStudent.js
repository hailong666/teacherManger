const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'ClassStudent',
  tableName: 'class_students',
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
    student_id: {
      type: 'int',
      nullable: false
    },
    join_date: {
      type: 'date',
      nullable: false,
      comment: '加入日期'
    },
    leave_date: {
      type: 'date',
      nullable: true,
      comment: '离开日期'
    },
    status: {
      type: 'enum',
      enum: ['active', 'transferred', 'graduated', 'dropped'],
      default: 'active',
      comment: '状态'
    },
    seat_number: {
      type: 'varchar',
      length: 10,
      nullable: true,
      comment: '座位号'
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
    student: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'student_id'
      },
      onDelete: 'CASCADE'
    }
  },
  indices: [
    {
      name: 'idx_class_id',
      columns: ['class_id']
    },
    {
      name: 'idx_student_id',
      columns: ['student_id']
    },
    {
      name: 'idx_status',
      columns: ['status']
    }
  ],
  uniques: [
    {
      name: 'uk_class_student_active',
      columns: ['class_id', 'student_id', 'status']
    }
  ]
});