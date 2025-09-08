const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Attendance',
  tableName: 'attendance',
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
    class_time: {
      type: 'datetime',
      nullable: false
    },
    location_lat: {
      type: 'decimal',
      precision: 10,
      scale: 7,
      nullable: true
    },
    location_lng: {
      type: 'decimal',
      precision: 10,
      scale: 7,
      nullable: true
    },
    status: {
      type: 'enum',
      enum: ['present', 'late', 'absent'],
      default: 'present'
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
      name: 'idx_student_class',
      columns: ['student_id', 'class_id']
    },
    {
      name: 'idx_class_time',
      columns: ['class_time']
    }
  ]
});