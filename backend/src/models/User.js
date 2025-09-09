const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    username: {
      type: 'varchar',
      length: 50,
      nullable: false,
      unique: true,
      comment: '用户名'
    },
    password: {
      type: 'varchar',
      length: 255,
      nullable: false,
      comment: '密码'
    },
    name: {
      type: 'varchar',
      length: 100,
      nullable: false,
      comment: '真实姓名'
    },
    role_id: {
      type: 'int',
      nullable: true,
      comment: '角色ID'
    },
    student_id: {
      type: 'varchar',
      length: 20,
      nullable: true,
      unique: true,
      comment: '学号（学生专用）'
    },
    teacher_id: {
      type: 'varchar',
      length: 20,
      nullable: true,
      unique: true,
      comment: '工号（教师专用）'
    },
    email: {
      type: 'varchar',
      length: 100,
      nullable: true,
      unique: true,
      comment: '邮箱'
    },
    phone: {
      type: 'varchar',
      length: 20,
      nullable: true,
      comment: '手机号'
    },
    avatar: {
      type: 'varchar',
      length: 255,
      nullable: true,
      comment: '头像URL'
    },
    gender: {
      type: 'enum',
      enum: ['male', 'female', 'other'],
      nullable: true,
      comment: '性别'
    },
    birth_date: {
      type: 'date',
      nullable: true,
      comment: '出生日期'
    },
    address: {
      type: 'text',
      nullable: true,
      comment: '地址'
    },
    emergency_contact: {
      type: 'varchar',
      length: 100,
      nullable: true,
      comment: '紧急联系人'
    },
    emergency_phone: {
      type: 'varchar',
      length: 20,
      nullable: true,
      comment: '紧急联系电话'
    },
    status: {
      type: 'enum',
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      comment: '状态'
    },
    last_login_at: {
      type: 'timestamp',
      nullable: true,
      comment: '最后登录时间'
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
    role: {
      type: 'many-to-one',
      target: 'Role',
      joinColumn: {
        name: 'role_id'
      }
    },
    teachingClasses: {
      type: 'one-to-many',
      target: 'Class',
      inverseSide: 'teacher'
    },
    assistantClasses: {
      type: 'one-to-many',
      target: 'Class',
      inverseSide: 'assistantTeacher'
    },
    classStudents: {
      type: 'one-to-many',
      target: 'ClassStudent',
      inverseSide: 'student'
    },
    attendances: {
      type: 'one-to-many',
      target: 'Attendance',
      inverseSide: 'student'
    },
    teacherAttendances: {
      type: 'one-to-many',
      target: 'Attendance',
      inverseSide: 'teacher'
    },
    points: {
      type: 'one-to-many',
      target: 'Points',
      inverseSide: 'student'
    },
    teacherPoints: {
      type: 'one-to-many',
      target: 'Points',
      inverseSide: 'teacher'
    },
    recitations: {
      type: 'one-to-many',
      target: 'Recitation',
      inverseSide: 'student'
    },
    teacherRecitations: {
      type: 'one-to-many',
      target: 'Recitation',
      inverseSide: 'teacher'
    },
    randomCalls: {
      type: 'one-to-many',
      target: 'RandomCall',
      inverseSide: 'teacher'
    },
    assignments: {
      type: 'one-to-many',
      target: 'Assignment',
      inverseSide: 'teacher'
    },
    submissions: {
      type: 'one-to-many',
      target: 'AssignmentSubmission',
      inverseSide: 'student'
    },
    gradedSubmissions: {
      type: 'one-to-many',
      target: 'AssignmentSubmission',
      inverseSide: 'gradedBy'
    }
  },
  indices: [
    {
      name: 'idx_username',
      columns: ['username']
    },
    {
      name: 'idx_role_id',
      columns: ['role_id']
    },
    {
      name: 'idx_student_id',
      columns: ['student_id']
    },
    {
      name: 'idx_teacher_id',
      columns: ['teacher_id']
    },
    {
      name: 'idx_status',
      columns: ['status']
    }
  ]
});