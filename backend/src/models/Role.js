const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Role',
  tableName: 'roles',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true
    },
    name: {
      type: 'varchar',
      length: 50,
      nullable: false,
      unique: true,
      comment: '角色名称'
    },
    display_name: {
      type: 'varchar',
      length: 100,
      nullable: false,
      comment: '显示名称'
    },
    description: {
      type: 'text',
      nullable: true,
      comment: '角色描述'
    },
    level: {
      type: 'int',
      nullable: false,
      default: 0,
      comment: '角色级别，数字越大权限越高'
    },
    is_active: {
      type: 'boolean',
      default: true,
      comment: '是否启用'
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
    users: {
      type: 'one-to-many',
      target: 'User',
      inverseSide: 'role'
    },
    permissions: {
      type: 'many-to-many',
      target: 'Permission',
      joinTable: {
        name: 'role_permissions',
        joinColumn: {
          name: 'role_id',
          referencedColumnName: 'id'
        },
        inverseJoinColumn: {
          name: 'permission_id',
          referencedColumnName: 'id'
        }
      }
    }
  },
  indices: [
    {
      name: 'idx_name',
      columns: ['name']
    },
    {
      name: 'idx_level',
      columns: ['level']
    }
  ]
});