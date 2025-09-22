/**
 *  Lambda 함수
 *  Amazon EventBridge(Scheduler)에 의해 주기적으로 실행
 *  DynamoDB에서 일본어 표현을 랜덤으로 조회한 뒤, 지정된 Slack 채널로 메시지를 전송합니다.
 *  전송 후에는 해당 표현의 count 값을 1 증가시켜 전송 이력을 관리합니다.
 */
 
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || 'ap-northeast-2';
const dynamoDbClient = new DynamoDBClient({ region: REGION });
const ddbDocClient = DynamoDBDocumentClient.from(dynamoDbClient);

const TABLE_NAME = process.env.TABLE_NAME;
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

async function getAllPhrases() {
    const command = new ScanCommand({
        TableName: TABLE_NAME,
    });
    const response = await ddbDocClient.send(command);
    console.log(`DynamoDB에서 ${response.Items.length}개의 항목을 가져왔습니다.`);
    return response.Items;
}

async function incrementPhraseCount(phraseId) {
    const command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
            id: phraseId,
            language: 'jp'
        },
        UpdateExpression: "SET #count = #count + :incr",
        ExpressionAttributeNames: {
            "#count": "count"
        },
        ExpressionAttributeValues: {
            ":incr": 1
        },
        ReturnValues: "UPDATED_NEW"
    });
    
    const response = await ddbDocClient.send(command);
    console.log(`'${phraseId}' 항목의 count가 ${response.Attributes.count}(으)로 업데이트되었습니다.`);
}

async function sendSlackMessage(phrase) {
    const message = {
        blocks: [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: "똑똑! 오늘의 표현이 도착했어요",
                    emoji: true
                }
            },
            {
                type: "divider"
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*🇯🇵 일본어*\n${phrase.expression.jp}`
                    },
                    {
                        type: "mrkdwn",
                        text: `*🇰🇷 한국어*\n${phrase.expression.kr}`
                    }
                ]
            },
            {
                type: "section",
                fields: [
                    {
                        type: "mrkdwn",
                        text: `*🗣️ 발음*\n${phrase.pronunciation}`
                    }
                ]
            }
        ]
    };

    const response = await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
    });

    if (!response.ok) {
        throw new Error(`Slack 메시지 전송 실패: ${response.statusText}`);
    }
    console.log("Slack 메시지를 성공적으로 전송했습니다.");
}

export const handler = async (event) => {
    console.log(`Scheduler가 함수를 실행했습니다: ${JSON.stringify(event)}`);

    if (!TABLE_NAME || !SLACK_WEBHOOK_URL) {
        console.error("환경 변수 TABLE_NAME 또는 SLACK_WEBHOOK_URL이 설정되지 않았습니다.");
        return;
    }

    try {
        const allPhrases = await getAllPhrases();
        if (allPhrases.length === 0) {
            console.log("DB에 표현이 없어 메시지를 보내지 않습니다.");
            return;
        }

        const randomIndex = Math.floor(Math.random() * allPhrases.length);
        const selectedPhrase = allPhrases[randomIndex];
        console.log(`선택된 표현: ${JSON.stringify(selectedPhrase)}`);

        await sendSlackMessage(selectedPhrase);
        
        await incrementPhraseCount(selectedPhrase.id);
        
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "성공적으로 Slack 메시지를 전송했습니다." })
        };

    } catch (error) {
        console.error("작업 중 오류 발생:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: error.message })
        };
    }
};
