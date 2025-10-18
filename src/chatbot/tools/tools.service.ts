import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Document } from '@langchain/core/documents';
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from '@langchain/openai';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { QdrantClient } from "@qdrant/js-client-rest";




interface VectorSearchResult {
    content: string;
    score: number;
}

@Injectable()
export class VectorToolsService implements OnModuleInit {
    private toolVectorStore: QdrantVectorStore;
    private openAIEmbeddings: OpenAIEmbeddings;
    private toolRegistry: Map<string, DynamicStructuredTool>;
    private nameToIdMap: Map<string, string>;  // tool.name → UUID (Qdrant point ID)
    private readonly vectorCollections = ['faq', 'agentic-rag-collection'];


    constructor(private configService: ConfigService) {
        // initialize openai embeddings
        this.openAIEmbeddings = new OpenAIEmbeddings({
            model: 'text-embedding-3-small',
            openAIApiKey: this.configService.get<string>('OPENAI_API_KEY'),
        })
        this.toolRegistry = new Map();
        this.nameToIdMap = new Map();
    }

    async onModuleInit() {
        // Initialize tools on module startup
        await this.initializeTools();
    }

    private async initializeTools(): Promise<void> {
        // get qdrant client
        const qdrantClient = new QdrantClient({ url: this.configService.get<string>('QDRANT_URL') });

        // **ADD THIS: Ensure tool_registry collection exists**
        try {
            await qdrantClient.getCollection('tool_registry');
        } catch (error) {
            // Collection doesn't exist, create it
            await qdrantClient.createCollection('tool_registry', {
                vectors: {
                    size: 1536,  // text-embedding-3-small dimension
                    distance: 'Cosine'
                }
            });
            console.log('Created tool_registry collection');
        }

        // Tool vector store 미리 초기화 (컬렉션 자동 생성 준비)
        this.toolVectorStore = new QdrantVectorStore(this.openAIEmbeddings, {
            url: this.configService.get<string>('QDRANT_URL'),
            collectionName: 'tool_registry',
        });

        // 기존 tool vector store에서 메타 로드 (재시작 시 동기화)
        await this.loadExistingToolMetadata(qdrantClient)

        // Create tool registry
        for (const collection of this.vectorCollections) {
            const toolName = `${collection}_search`;

            // Check if tool already exists in Qdrant (loaded from loadExistingToolMetadata)
            const existingToolId = this.nameToIdMap.get(toolName);
            const tool = await this.createVectorTool(collection);
            this.toolRegistry.set(toolName, tool);
            
            // Only add to Qdrant if it wasn't loaded from existing data
            if (!existingToolId) {
                const toolId = uuidv4()
                // Tool 문서 생성 (ID 대신 name 사용)
                const toolDocument = new Document({
                    pageContent: tool.description,
                    metadata: { name: tool.name }  // ID 제거, name만
                });
                await this.toolVectorStore.addDocuments([toolDocument], {ids: [toolId]});
                this.nameToIdMap.set(toolName, toolId);  // Ensure map is updated
            }
        }
    }

    private async loadExistingToolMetadata(qdrantClient: QdrantClient): Promise<void> {
        try {            

            await qdrantClient.getCollection('tool_registry');  // 존재하면 OK, 없으면 catch로 감
            console.log('tool_registry collection exists, loading metadata...');

            const scrollResponse = await qdrantClient.scroll('tool_registry', {
                limit: this.vectorCollections.length + 10,  // 여유
                with_payload: true,  // metadata 포함
                with_vector:false
            })
            console.log(`Found ${scrollResponse.points.length} points in tool_registry`);

            // Use a Set to track unique tool names (avoid duplicates)
            const processedTools = new Set<string>();

            for (const point of scrollResponse.points) {
                // console.log('Point:', JSON.stringify(point, null, 2));

                const payload = point.payload as any
                const toolName = payload?.metadata?.name;  // Access nested metadata.name
                const toolId = point.id
                
                console.log(`Processing point - toolName: ${toolName}, toolId: ${toolId}, type: ${typeof toolId}`);

                if (toolName && toolId && !processedTools.has(toolName)) {
                    const idAsString = typeof toolId === 'string' ? toolId : String(toolId);
                    this.nameToIdMap.set(toolName, idAsString);
                    processedTools.add(toolName);
                    console.log(`✓ Loaded existing tool: ${toolName} -> ${idAsString}`);
                }
            }
        } catch (error) {
            console.warn('Failed to load existing tool metadata:', error);
        }
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
                return JSON.stringify(formattedResults, null, 2)
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
