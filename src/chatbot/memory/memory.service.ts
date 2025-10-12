import { Injectable, OnModuleInit } from '@nestjs/common';
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres"
import { PostgresStore, PostgresStoreConfig } from "@langchain/langgraph-checkpoint-postgres/store"
import { Connection } from "pg";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class MemoryService implements OnModuleInit {
    private store: PostgresStore;
    private checkpointer: PostgresSaver;

    constructor(private configService: ConfigService) {
    // ConnectionPool creation
    // this.pool = new ConnectionPool({
    //      connectionString: process.env.POSTGRES_CONNECTION_STRING,
    //     min: 1,
    //     max: 10,
    //     autocommit: true,
    //     prepare_threshold: 0,
    // });
    
    const connectionOptions = {
      host: this.configService.get<string>('POSTGRES_HOST', 'localhost'),
      port: this.configService.get<number>('POSTGRES_PORT', 5432),
      database: this.configService.get<string>('POSTGRES_DB', 'postgres'),
      user: this.configService.get<string>('POSTGRES_USER', 'postgres'),
      password: this.configService.get<string>('POSTGRES_PASSWORD', '1234'),
    };

    this.store = new PostgresStore({ connectionOptions });

    const connectionString = `postgresql://${connectionOptions.user}:${connectionOptions.password}@${connectionOptions.host}:${connectionOptions.port}/${connectionOptions.database}`;
    this.checkpointer = PostgresSaver.fromConnString(connectionString, {
    // schema: "schema_name" -> defaults to "public"
    }); 
    }

    async onModuleInit() {
    try {
        // Initialize database tables
      await this.store.setup();
      await this.checkpointer.setup();
    } catch (error) {
      throw new Error('Database initialization failed');
    }
    }

    // Optional: Getter methods to access store and checkpointer
    getStore(): PostgresStore {
        return this.store;
    }

    getCheckpointer(): PostgresSaver {
        return this.checkpointer;
    }
}
