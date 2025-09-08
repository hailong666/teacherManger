const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Permission',
  tableName: 'permissions',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    role: {
      type: 'enum',
      enum: ['teacher', 'class_leader', 'student'],
      nullable: false
    },
    resource: {
      type: 'varchar',
      length: 50,
      nullable: false
    },
    action: {
      type: 'enum',
      enum: ['view', 'edit', 'delete'],
      nullable: false
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
  indices: [
    {
      name: 'idx_role_resource',
      columns: ['role', 'resource']
    }
  ],
  uniques: [
    {
      name: 'uk_role_resource_action',
      columns: ['role', 'resource', 'action']
    }
  ]
});