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
      nullable: false,
      comment: '学生ID'
    },
    class_id: {
      type: 'int',
      nullable: false,
      comment: '班级ID'
    },
    date: {
      type: 'date',
      nullable: false,
      comment: '考勤日期'
    },
    time_slot: {
      type: 'varchar',
      length: 20,
      nullable: true,
      comment: '时间段（如：上午、下午、晚上）'
    },
    status: {
      type: 'enum',
      enum: ['present', 'absent', 'late', 'excused', 'sick_leave'],
      default: 'present',
      comment: '考勤状态'
    },
    check_in_time: {
      type: 'time',
      nullable: true,
      comment: '签到时间'
    },
    check_out_time: {
      type: 'time',
      nullable: true,
      comment: '签退时间'
    },
    location: {
      type: 'varchar',
      length: 100,
      nullable: true,
      comment: '考勤地点'
    },
    notes: {
      type: 'text',
      nullable: true,
      comment: '备注'
    },
    recorded_by: {
      type: 'int',
      nullable: true,
      comment: '记录者ID'
    },
    is_manual: {
      type: 'boolean',
      default: false,
      comment: '是否手动录入'
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
    student: {
      type: 'many-to-one',
      target: 'User',
      joinColumn: {
        name: 'student_id'
      }
    },
    class: {
      type: 'many-to-one',
      target: 'Class',
      joinColumn: {
        name: 'class_id'
      }
    },
    // recordedBy: {
    //   type: 'many-to-one',
    //   target: 'User',
    //   joinColumn: {
    //     name: 'recorded_by'
    //   }
    // }
  },
  indices: [
    {
      name: 'idx_student_date',
      columns: ['student_id', 'date']
    },
    {
      name: 'idx_class_date',
      columns: ['class_id', 'date']
    },
    {
      name: 'idx_status',
      columns: ['status']
    },
    {
      name: 'idx_recorded_by',
      columns: ['recorded_by']
    }
  ],
  uniques: [
    {
      name: 'unique_student_class_date_timeslot',
      columns: ['student_id', 'class_id', 'date', 'time_slot']
    }
  ]
});