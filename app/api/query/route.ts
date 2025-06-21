import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
}





// Map outputMode string to int for DB
const outputModeMap: Record<string, number> = {
  table: 1,
  chart: 2,
  pie: 3,
}

export async function POST(req: NextRequest) {
  console.time("🔁 TOTAL /api/query")
  let connection;
  try {
    const body = await req.json();

    // ---- 1. Save Query Branch ----
    if (body.action === "save") {
      const {
        question,
        sql,
        outputMode,
        columns,
        dataSample,
        userId = 1, // hardcoded or dynamic
        companyId = 1, // hardcoded or dynamic
        visualConfig = null,
        panelPosition = null
      } = body;

      if (!question || !sql || !outputMode || !columns) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
      }

      const output_mode = outputModeMap[outputMode] || 1;

      connection = await mysql.createConnection(dbConfig);

      const [result] = await connection.execute(
        `INSERT INTO saved_queries
          (user_id, company_id, query_text, sql_text, output_mode, created_at, visual_config, panel_position)
        VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)`,
        [
          userId,
          companyId,
          question,
          sql,
          output_mode,
          visualConfig ? JSON.stringify(visualConfig) : null,
          panelPosition
        ]
      );

      await connection.end();
      return NextResponse.json({ success: true, id: (result as any).insertId });
    }


    // ---- 2. Run Query Branch (default) ----
    const { sql } = body;
    console.log("🚨 Executing SQL:", sql);

    if (!sql || typeof sql !== 'string') {
      return NextResponse.json({ success: false, error: 'Missing or invalid SQL string' }, { status: 400 });
    }

    connection = await mysql.createConnection(dbConfig);

    const [rows, fields] = await connection.execute(sql);

    await connection.end();

    const columns = fields.map((field: any) => ({
      key: field.name,
      name: field.name,
    }));

    console.timeEnd("🔁 TOTAL /api/query");
    return NextResponse.json({ success: true, rows, columns });

  } catch (error: any) {
    console.error('[QUERY_ERROR]', error)
    if (connection) await connection.end();
    console.timeEnd("🔁 TOTAL /api/query");
    return NextResponse.json({ success: false, error: error.message || 'Query error' }, { status: 500 })
  }
}


// export async function POST(req: NextRequest) {
//   console.time("🔁 TOTAL /api/query")

//   try {
//     const { sql } = await req.json()
//     console.log("🚨 Executing SQL:", sql)  // <-- Add here

//     if (!sql || typeof sql !== 'string') {
//       return NextResponse.json({ success: false, error: 'Missing or invalid SQL string' }, { status: 400 })
//     }

//     console.time("⏳ DB CONNECT")
//     const connection = await mysql.createConnection(dbConfig)
//     console.timeEnd("⏳ DB CONNECT")

//     console.time("🕒 SQL EXECUTE")
//     const [rows, fields] = await connection.execute(sql)
//     console.timeEnd("🕒 SQL EXECUTE")

//     console.time("🔒 DB CLOSE")
//     await connection.end()
//     console.timeEnd("🔒 DB CLOSE")

//     console.time("📦 FORMAT COLUMNS")
//     const columns = fields.map((field: any) => ({
//       key: field.name,
//       name: field.name,
//     }))
//     console.timeEnd("📦 FORMAT COLUMNS")

//     console.timeEnd("🔁 TOTAL /api/query")
//     return NextResponse.json({ success: true, rows, columns })

//   } catch (error: any) {
//     console.error('[QUERY_ERROR]', error)
//     console.timeEnd("🔁 TOTAL /api/query")
//     return NextResponse.json({ success: false, error: error.message || 'Query error' }, { status: 500 })
//   }
// }
