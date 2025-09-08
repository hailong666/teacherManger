const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Class',
  tableName: 'classes',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    name: {
      type: 'varchar',
      length: 100,
      nullable: false
    },
    teacher_id: {
      type: 'int',
      nullable: false
    },
    description: {
      type: 'text',
      nullable: true
    },
    schedule: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    status: {
      type: 'boolean',
      default: true
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
    teacher: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'teacher_id'
      },
      onDelete: 'CASCADE'
    },
    students: {
      type: 'many-to-many',
      target: 'User',
      joinTable: {
        name: 'class_student',
        joinColumn: {
          name: 'class_id',
          referencedColumnName: 'id'
        },
        inverseJoinColumn: {
          name: 'student_id',
          referencedColumnName: 'id'
        }
      }
    }
  },
  indices: [
    {
      name: 'idx_teacher',
      columns: ['teacher_id']
    }
  ]
});