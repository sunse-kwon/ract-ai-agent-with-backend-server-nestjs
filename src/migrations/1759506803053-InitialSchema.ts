import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1759506803053 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`user\` (
                \`id\` INT NOT NULL AUTO_INCREMENT,
                \`email\` VARCHAR(255) NOT NULL,
                \`password\` VARCHAR(255) NOT NULL,
                \`name\` VARCHAR(255) NOT NULL,
                \`jti\` VARCHAR(255) NULL,
                \`isActive\` TINYINT NOT NULL DEFAULT 1,
                \`createdAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                \`deletedAt\` DATETIME(6) NULL,
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`IDX_user_email\` (\`email\`)
            ) ENGINE=InnoDB
            `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`user\``);
    }

}
