const { EntitySchema } = require('typeorm');
const bcrypt = require('bcryptjs');

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
      unique: true,
      nullable: false
    },
    password: {
      type: 'varchar',
      length: 100,
      nullable: false
    },
    name: {
      type: 'varchar',
      length: 50,
      nullable: false
    },
    email: {
      type: 'varchar',
      length: 100,
      unique: true,
      nullable: true
    },
    role: {
      type: 'enum',
      enum: ['teacher', 'class_leader', 'student'],
      default: 'student'
    },
    avatar: {
      type: 'varchar',
      length: 255,
      nullable: true
    },
    status: {
      type: 'int',
      default: 1
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
      name: 'idx_username',
      columns: ['username']
    },
    {
      name: 'idx_role',
      columns: ['role']
    }
  ],
  listeners: {
    beforeInsert: async (event) => {
      if (event.entity.password) {
        const salt = await bcrypt.genSalt(10);
        event.entity.password = await bcrypt.hash(event.entity.password, salt);
      }
    },
    beforeUpdate: async (event) => {
      if (event.entity.password && event.entity.password !== event.databaseEntity.password) {
        const salt = await bcrypt.genSalt(10);
        event.entity.password = await bcrypt.hash(event.entity.password, salt);
      }
    }
  },
  methods: {
    async comparePassword(candidatePassword) {
      return await bcrypt.compare(candidatePassword, this.password);
    }
  }
});