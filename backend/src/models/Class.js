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
      nullable: false,
      comment: '班级名称'
    },
    code: {
      type: 'varchar',
      length: 20,
      nullable: true,
      comment: '班级代码'
    },
    grade: {
      type: 'varchar',
      length: 20,
      nullable: false,
      comment: '年级'
    },
    teacher_id: {
      type: 'int',
      nullable: false,
      comment: '班主任ID'
    },
    assistant_teacher_id: {
      type: 'int',
      nullable: true,
      comment: '副班主任ID'
    },
    academic_year: {
      type: 'varchar',
      length: 20,
      nullable: false,
      comment: '学年'
    },
    semester: {
      type: 'enum',
      enum: ['spring', 'fall'],
      nullable: false,
      comment: '学期'
    },
    max_students: {
      type: 'int',
      default: 50,
      comment: '最大学生数'
    },
    current_students: {
      type: 'int',
      default: 0,
      comment: '当前学生数'
    },
    classroom: {
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: '教室'
    },
    description: {
      type: 'text',
      nullable: true,
      comment: '班级描述'
    },
    status: {
      type: 'enum',
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
      comment: '状态'
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
    teacher: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'teacher_id'
      }
    },
    assistantTeacher: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'assistant_teacher_id'
      }
    },
    classStudents: {
      type: 'one-to-many',
      target: 'ClassStudent',
      inverseSide: 'class'
    },
    attendances: {
      type: 'one-to-many',
      target: 'Attendance',
      inverseSide: 'class'
    },
    points: {
      type: 'one-to-many',
      target: 'Points',
      inverseSide: 'class'
    },
    recitations: {
      type: 'one-to-many',
      target: 'Recitation',
      inverseSide: 'class'
    },
    randomCalls: {
      type: 'one-to-many',
      target: 'RandomCall',
      inverseSide: 'class'
    },
    assignments: {
      type: 'one-to-many',
      target: 'Assignment',
      inverseSide: 'class'
    }
  },
  indices: [
    {
      name: 'idx_teacher_id',
      columns: ['teacher_id']
    },
    {
      name: 'idx_grade',
      columns: ['grade']
    },
    {
      name: 'idx_academic_year',
      columns: ['academic_year']
    },
    {
      name: 'idx_status',
      columns: ['status']
    }
  ]
});