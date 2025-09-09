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
    name: {
      type: 'varchar',
      length: 100,
      nullable: false,
      unique: true,
      comment: '权限标识'
    },
    display_name: {
      type: 'varchar',
      length: 100,
      nullable: false,
      comment: '权限显示名称'
    },
    description: {
      type: 'text',
      nullable: true,
      comment: '权限描述'
    },
    module: {
      type: 'varchar',
      length: 50,
      nullable: false,
      comment: '所属模块'
    },
    action: {
      type: 'varchar',
      length: 50,
      nullable: false,
      comment: '操作类型'
    },
    resource: {
      type: 'varchar',
      length: 50,
      nullable: true,
      comment: '资源类型'
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
    roles: {
      type: 'many-to-many',
      target: 'Role',
      inverseSide: 'permissions'
    }
  },
  indices: [
    {
      name: 'idx_module',
      columns: ['module']
    },
    {
      name: 'idx_name',
      columns: ['name']
    }
  ]
});