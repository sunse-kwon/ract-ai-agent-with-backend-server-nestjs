import { DataSource } from "typeorm"
import { User } from '../core/entities/users/users.entity'
import { join } from "path";

const AppDataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "1234",
    database: "chatbot_db",
    synchronize: false,
    logging: true,
    logger: 'file',
    entities: [
        User
    ],
    migrations: [
        join(__dirname, '..', 'migrations', '*.ts'),
        join(__dirname, '..', 'migrations', '*.js')
    ],
});

export default AppDataSource;