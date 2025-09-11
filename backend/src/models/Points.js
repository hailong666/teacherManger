const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Points',
  tableName: 'points',
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
    points: {
      type: 'int',
      nullable: false
    },
    reason: {
      type: 'text',
      nullable: true
    },
    awarded_by: {
      type: 'int',
      nullable: false
    },
    createdAt: {
      type: 'timestamp',
      createDate: true
    },
    updatedAt: {
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
    },
    teacher: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'awarded_by'
      },
      onDelete: 'CASCADE'
    }
  },
  indices: [
    {
      name: 'idx_student_points',
      columns: ['student_id']
    },
    {
      name: 'idx_class_points',
      columns: ['class_id']
    },
    {
      name: 'idx_points_value',
      columns: ['points']
    }
  ],
  checks: [
    {
      expression: 'points != 0'
    }
  ]
});