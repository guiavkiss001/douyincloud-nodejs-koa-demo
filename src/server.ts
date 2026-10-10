import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from '@koa/router';
import https from 'https';

const app = new Koa();
const router = new Router();

// 从环境变量读取豆包(火山引擎方舟)配置，在抖音云"服务设置-环境变量"里配置
const ARK_API_KEY = process.env.ARK_API_KEY || '';
const ARK_MODEL = process.env.ARK_MODEL || 'doubao-seed-1-6-250615';

function callArk(name: string): Promise<string[]> {
  const prompt = '你是动物生存环境讲解助手。请用生活化的中文，用1-3条要点讲清楚「' + name + '」适宜的生存环境，要点包括：栖息地类型、适宜温度或气候、主要食物来源、生存特点或天敌。每条不超过35字，直接输出要点，用换行分隔，不要任何前言和序号。';
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: ARK_MODEL,
      messages: [
        { role: 'system', content: '你只输出要点，不要多余的话。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    });
    const req = https.request({
      hostname: 'ark.cn-beijing.volces.com',
      path: '/api/v3/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + ARK_API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const content = (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) || '';
          const steps = content.split('\n').map((s) => s.replace(/^[\d.\-、\s]+/, '').trim()).filter((s) => s);
          resolve(steps.length ? steps : ['暂无相关内容']);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

router.get('/', (ctx) => {
  ctx.body = 'Nodejs koa demo project';
});

// 联网查询动物生存环境讲解（豆包生成）
router.post('/api/animal', async (ctx) => {
  const name = ((ctx.request.body && ctx.request.body.name) || '').toString().trim();
  if (!name) {
    ctx.body = { success: false, message: 'name is required' };
    return;
  }
  try {
    const steps = await callArk(name);
    ctx.body = { success: true, title: name + '适宜的生存环境', steps: steps };
  } catch (e) {
    ctx.body = { success: false, message: 'AI request failed' };
  }
});

app.use(bodyParser());
app.use(router.routes());
const PORT = 8000;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});
