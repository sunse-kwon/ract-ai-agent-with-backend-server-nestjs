import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Document } from '@langchain/core/documents';
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from '@langchain/openai';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

interface VectorSearchResult {
    content: string;
    score: number;
}

@Injectable()
export class VectorToolsService implements OnModuleInit {
    private toolVectorStore: QdrantVectorStore;
    private openAIEmbeddings: OpenAIEmbeddings;
    private toolRegistry: Map<string, DynamicStructuredTool>;
    private readonly vectorCollections = ['faq', 'agentic-rag-collection'];


    constructor(private configService: ConfigService) {
        // initialize openai embeddings
        this.openAIEmbeddings = new OpenAIEmbeddings({
            model: 'text-embedding-3-small',
            openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
        })
        this.toolRegistry = new Map();
    }

    async onModuleInit() {
        // Initialize tools on module startup
        await this.initializeTools();
    }

    private async initializeTools(): Promise<void> {
        // Create tool registry
        for (const collection of this.vectorCollections) {
            const toolId = uuidv4();
            const tool = await this.createVectorTool(collection);
            this.toolRegistry.set(toolId, tool);
        }

        // create tool documents
        const toolDocuments = Array.from(this.toolRegistry.entries()).map(
            ([id, tool]) => new Document({
                pageContent: tool.description,
                metadata: {
                    id: id,
                    name: tool.name
                }
            })
        )

        // Initialize tool vector store with Qdrant
        this.toolVectorStore = await QdrantVectorStore.fromDocuments(
            toolDocuments,
            this.openAIEmbeddings,
            {
                url: this.configService.get<string>('QDRANT_URL'),
                collectionName: 'tool_registry',
            }
        )  
    }

    private async createVectorTool(collection: string): Promise<DynamicStructuredTool> {
        let toolVectorStore: QdrantVectorStore;
        try {
            toolVectorStore = await QdrantVectorStore.fromExistingCollection(
                this.openAIEmbeddings,
                {
                    url: this.configService.get<string>('QDRANT_URL'),
                    collectionName: collection
                }
        )
        } catch (error) {
            toolVectorStore = await QdrantVectorStore.fromDocuments(
                [],
                this.openAIEmbeddings,
                {
                    url: this.configService.get<string>('QDRANT_URL'),
                    collectionName: collection
                }
            )
        }
        
        return new DynamicStructuredTool({
            name: `${collection}_search`,
            description: `Search ${collection} documents in vector DB`,
            schema: z.object({
                query: z.string().describe(`Search query`),
                k: z.number().default(5).describe(`Number of results (default 5)`)
            }),
            func: async ({ query, k = 5 }): Promise<string> => {
                const results = await toolVectorStore.similaritySearchWithScore(query, Math.min(k,10))
                const formattedResults: VectorSearchResult[] = results.map(([doc, score]) =>({
                    content: doc.pageContent,
                    score: score
                }))
                return String(formattedResults)
            }
        })
    }

    // Public methods to access tools
    getToolRegistry(): Map<string, DynamicStructuredTool> {
        return this.toolRegistry;
    }

    // Get the tool vector store
    getToolVectorStore(): QdrantVectorStore {
        if (!this.toolVectorStore) {
            throw new Error('Tool vector store not initialized');
        }
        return this.toolVectorStore;
    }



}
