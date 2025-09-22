/**
 * 요청 본문(body)에 따라 두 가지 작업을 수행하는 API Lambda 
 * 1. 'koreanText'가 있으면 Bedrock AI를 호출하여 일본어 번역 및 발음을 생성
 * 2. 'expression'과 'pronunciation'이 있으면 해당 내용을 DynamoDB에 저장
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { randomUUID } from "crypto";

const REGION = process.env.AWS_REGION || 'ap-northeast-2';

const dynamoDbClient = new DynamoDBClient({ region: REGION });
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDbClient);
const bedrockRuntimeClient = new BedrockRuntimeClient({ region: REGION });
const TABLE_NAME = process.env.TABLE_NAME || 'knock-knock';


const handleAiRequest = async (body) => {
    try {
        const { koreanText: korean_phrase } = body;
        if (!korean_phrase) {
            throw new Error("koreanText 필드가 비어있습니다.");
        }
        const modelId = 'anthropic.claude-3-5-sonnet-20240620-v1:0';
        const prompt = `
    Human: 다음 한국어 문장을 일본어로 번역하고, 그 일본어 문장에 대한 한국어 발음을 생성해주세요.
    결과는 반드시 아래와 같은 JSON 형식으로만 응답해주세요. 다른 설명은 절대 추가하지 마세요.
    한국어 문장: "${korean_phrase}"
    JSON 형식:
    {
      "japaneseTranslation": "여기에 일본어 번역 결과",
      "koreanPronunciation": "여기에 한국어 발음 결과"
    }
    Assistant:`;
        const bedrockBody = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [{ "role": "user", "content": [{ "type": "text", "text": prompt }] }]
        };
        const command = new InvokeModelCommand({
            body: JSON.stringify(bedrockBody), modelId, contentType: "application/json", accept: "application/json",
        });

        console.log(`Bedrock 모델 호출 시작 (모델 ID: ${modelId})...`);
        const response = await bedrockRuntimeClient.send(command);
        console.log("Bedrock 모델 호출 성공.");

        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        const aiResponseText = responseBody.content[0].text;
        const aiResult = JSON.parse(aiResponseText);
        return { statusCode: 200, body: JSON.stringify(aiResult) };
    } catch (error) {
        console.error("Bedrock 요청 처리 중 오류 발생:", error);
        throw new Error(`Bedrock AI 모델 호출에 실패했습니다: ${error.name}`);
    }
};

const handleDbSaveRequest = async (body) => {
    const { expression, pronunciation } = body;
    if (!expression?.jp || !expression?.kr || !pronunciation) {
        throw new Error("expression(jp, kr)과 pronunciation 필드는 필수입니다.");
    }
    const item = {
        id: randomUUID(), language: 'jp', expression, pronunciation, count: 0,
        created_at: Math.floor(Date.now() / 1000)
    };
    const command = new PutCommand({ TableName: TABLE_NAME, Item: item });
    await ddbDocClient.send(command);
    return { statusCode: 201, body: JSON.stringify({ message: '성공적으로 저장되었습니다.', item }) };
};



export const handler = async (event) => {
    console.log(`Received event: ${JSON.stringify(event)}`);

    if (event.httpMethod === 'OPTIONS' || event.requestContext?.http?.method === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date',
                'Access-Control-Allow-Methods': 'OPTIONS,POST'
            },
            body: ''
        };
    }

    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
    };

    try {
        const body = JSON.parse(event.body || '{}');
        let result;
        if ('koreanText' in body) {
            result = await handleAiRequest(body);
        } else if ('expression' in body && 'pronunciation' in body) {
            result = await handleDbSaveRequest(body);
        } else {
            throw new Error("요청 형식이 잘못되었습니다.");
        }
        return { ...result, headers };
    } catch (e) {
        console.error(`Error: ${e}`);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ message: e.message || '알 수 없는 오류가 발생했습니다.' })
        };
    }
};
