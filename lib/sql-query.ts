import { businessPrisma } from './mysql-prisma'
import { validateSqlQuery, validateAiGeneratedQuery, logValidationResult } from './sql-validator'

export interface QueryResult {
  success: boolean
  rows?: any[]
  columns?: { key: string; name: string }[]
  error?: string
}

export async function executeSQLQuery(sql: string, originalQuestion?: string): Promise<QueryResult> {
  try {
    // Enhanced validation using our new validator
    const validation = originalQuestion 
      ? validateAiGeneratedQuery(sql, originalQuestion)
      : validateSqlQuery(sql)
    
    // Log validation result for monitoring
    logValidationResult(sql, validation, originalQuestion ? 'AI_GENERATED' : 'MANUAL')
    
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || 'Query validation failed'
      }
    }
    
    // Show warnings in console but don't block execution
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn('⚠️ SQL Query Warnings:', validation.warnings)
    }

    // Execute raw SQL query using Prisma
    const result = await businessPrisma.$queryRawUnsafe(sql)
    
    if (!result || (Array.isArray(result) && result.length === 0)) {
      return {
        success: true,
        rows: [],
        columns: []
      }
    }

    const rows = Array.isArray(result) ? result : [result]
    
    if (rows.length === 0) {
      return {
        success: true,
        rows: [],
        columns: []
      }
    }

    // Extract column names from the first row
    const firstRow = rows[0]
    const columns = Object.keys(firstRow).map(key => {
      // If the key contains quotes, it's likely an alias - use it as is
      if (key.includes('"') || key.includes("'")) {
        // Remove quotes and use the alias name
        const cleanName = key.replace(/['"]/g, '')
        return {
          key,
          name: cleanName
        }
      }
      
      // For regular column names, apply the existing formatting
      return {
        key,
        name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
      }
    })

    // Post-process results to ensure ascending order by first numeric column
    let sortedRows = rows
    if (rows.length > 0) {
      const firstRow = rows[0]
      
      // Look for common numeric column names first
      const priorityColumns = ['Total Amount', 'Gift Amount', 'Donation Amount', 'Average Amount', 'Gift Count']
      let primaryNumericColumn = null
      
      // First try to find priority columns
      for (const colName of priorityColumns) {
        if (firstRow.hasOwnProperty(colName)) {
          primaryNumericColumn = colName
          break
        }
      }
      
      // If no priority column found, look for any numeric column
      if (!primaryNumericColumn) {
        const numericColumns = Object.keys(firstRow).filter(key => {
          const value = firstRow[key]
          return typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))
        })
        
        if (numericColumns.length > 0) {
          primaryNumericColumn = numericColumns[0]
        }
      }
      
      // Sort if we found a numeric column
      if (primaryNumericColumn) {
        console.log(`🔢 Sorting by column: "${primaryNumericColumn}"`)
        sortedRows = [...rows].sort((a, b) => {
          const aVal = Number(a[primaryNumericColumn]) || 0
          const bVal = Number(b[primaryNumericColumn]) || 0
          return aVal - bVal // Ascending order
        })
        console.log(`📊 Sorted ${sortedRows.length} rows in ascending order`)
      } else {
        console.log('⚠️ No numeric column found for sorting')
      }
    }

    return {
      success: true,
      rows: sortedRows,
      columns
    }

  } catch (error) {
    console.error('SQL query error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Helper function to convert natural language to SQL
export function generateSQLFromQuestion(question: string): string {
  const lowerQuestion = question.toLowerCase()
  
  // Basic SQL generation based on question patterns
  if (lowerQuestion.includes('top') && lowerQuestion.includes('donor')) {
    return `
      SELECT 
        c.FULLNAME as 'Donor Name',
        SUM(CAST(g.GIFTAMOUNT AS DECIMAL(15,2))) as 'Total Amount',
        YEAR(g.GIFTDATE) as 'Year',
        g.*,
        c.EMAIL
      FROM gifts g 
      JOIN constituents c ON g.ACCOUNTID = c.ACCOUNTID
      GROUP BY g.ACCOUNTID, c.FULLNAME
      ORDER BY 'Total Amount' ASC
      LIMIT 10
    `
  }
  
  if (lowerQuestion.includes('gift') && lowerQuestion.includes('source')) {
    return `
      SELECT 
        g.SOURCECODE as 'Source',
        COUNT(*) as 'Gift Count',
        SUM(CAST(g.GIFTAMOUNT AS DECIMAL(15,2))) as 'Total Amount'
      FROM gifts g
      JOIN constituents c ON g.ACCOUNTID = c.ACCOUNTID
      GROUP BY g.SOURCECODE
      ORDER BY 'Total Amount' ASC
      LIMIT 20
    `
  }
  
  if (lowerQuestion.includes('designation')) {
    return `
      SELECT 
        g.DESIGNATION as 'Designation',
        COUNT(*) as 'Gift Count',
        SUM(CAST(g.GIFTAMOUNT AS DECIMAL(15,2))) as 'Total Amount'
      FROM gifts g
      JOIN constituents c ON g.ACCOUNTID = c.ACCOUNTID
      GROUP BY g.DESIGNATION
      ORDER BY 'Total Amount' ASC
      LIMIT 20
    `
  }
  
  if (lowerQuestion.includes('payment method')) {
    return `
      SELECT 
        g.PAYMENTMETHOD as 'Payment Method',
        COUNT(*) as 'Gift Count',
        SUM(CAST(g.GIFTAMOUNT AS DECIMAL(15,2))) as 'Total Amount'
      FROM gifts g
      JOIN constituents c ON g.ACCOUNTID = c.ACCOUNTID
      GROUP BY g.PAYMENTMETHOD
      ORDER BY 'Total Amount' ASC
      LIMIT 20
    `
  }
  
  // Default query with better column ordering
  return `
    SELECT 
      c.FULLNAME as 'Donor Name',
      g.GIFTAMOUNT as 'Donation Amount',
      g.GIFTDATE as 'Gift Date',
      g.SOURCECODE as 'Source',
      g.DESIGNATION as 'Designation',
      g.*,
      c.EMAIL
    FROM gifts g
    JOIN constituents c ON g.ACCOUNTID = c.ACCOUNTID
    ORDER BY g.GIFTDATE ASC
    LIMIT 50
  `
} 