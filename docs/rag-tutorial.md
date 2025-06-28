# 🧠 RAG (Retrieval-Augmented Generation) Tutorial

## 📚 **What is RAG?**

RAG combines the power of **information retrieval** with **AI generation** to create intelligent systems that can answer questions using your own knowledge base.

### **How RAG Works:**
1. **📖 Knowledge Storage**: Legal documents are chunked and stored with embeddings
2. **🔍 Smart Retrieval**: When you ask a question, the system finds relevant chunks
3. **🤖 AI Generation**: AI uses the retrieved context to generate accurate answers
4. **📝 Source Citation**: Responses include sources and confidence levels

---

## 🏗️ **Your RAG System Architecture**

### **Database Schema**
```sql
-- Knowledge base table
knowledge_base (
  id UUID PRIMARY KEY,
  content TEXT,           -- The actual legal content
  title TEXT,            -- Descriptive title
  source TEXT,           -- Where it came from
  category TEXT,         -- Type of content
  metadata JSONB,        -- Practice area, jurisdiction, etc.
  embedding VECTOR(1536), -- OpenAI embedding
  created_at TIMESTAMP
)
```

### **Key Components**
- **🗄️ Knowledge Base Service**: Manages adding/searching knowledge
- **🔍 Vector Search**: Finds similar content using embeddings
- **🤖 RAG Chat**: Interactive AI assistant
- **📊 Management Interface**: Add and organize knowledge

---

## 🚀 **Getting Started**

### **Step 1: Set Up the Database**
```bash
# Run the migration to create the knowledge base
npx supabase db push
```

### **Step 2: Add Your First Knowledge**
1. Go to `/dashboard/rag-knowledge`
2. Click "Add Knowledge" tab
3. Fill in:
   - **Title**: "Employment Act Overview"
   - **Source**: "Singapore Statutes Online"
   - **Category**: "Statute"
   - **Practice Area**: "Employment Law"
   - **Content**: Paste the legal text

### **Step 3: Test the System**
1. Switch to "Search & Test" tab
2. Ask: "What are the working hours in Singapore?"
3. Click "Test RAG Response"
4. See the AI response with sources!

---

## 📝 **Adding Different Types of Knowledge**

### **1. Legal Statutes**
```typescript
// Example: Employment Act
{
  title: "Employment Act - Working Hours",
  source: "Singapore Statutes Online",
  category: "statute",
  practiceArea: "Employment Law",
  content: "The maximum working hours for non-workmen is 44 hours per week..."
}
```

### **2. Case Law**
```typescript
// Example: Contract case
{
  title: "Sembcorp Marine Ltd v PPL Holdings Pte Ltd",
  source: "Singapore Court of Appeal",
  category: "case_law",
  practiceArea: "Contract Law",
  content: "The Court held that contractual interpretation requires..."
}
```

### **3. Practical Guides**
```typescript
// Example: How-to guide
{
  title: "How to Register a Company in Singapore",
  source: "ACRA Guidelines",
  category: "guide",
  practiceArea: "Corporate Law",
  content: "Step 1: Choose a company name. Step 2: Prepare documents..."
}
```

### **4. FAQs**
```typescript
// Example: Common question
{
  title: "Can I terminate an employee without notice?",
  source: "MOM FAQ",
  category: "faq",
  practiceArea: "Employment Law",
  content: "Generally, no. The Employment Act requires notice period..."
}
```

---

## 🎯 **Best Practices**

### **Content Quality**
- ✅ Use authoritative sources (statutes, court cases, official guidelines)
- ✅ Keep content current and accurate
- ✅ Write clear, descriptive titles
- ✅ Include proper metadata (practice area, jurisdiction)
- ❌ Don't add personal opinions or outdated information

### **Chunking Strategy**
- **Optimal Size**: 1000 characters per chunk
- **Overlap**: 200 characters between chunks
- **Natural Breaks**: System breaks at sentence boundaries
- **Context Preservation**: Related information stays together

### **Metadata Usage**
```typescript
{
  practice_area: "Employment Law",    // For filtering
  jurisdiction: "Singapore",          // Geographic scope
  authority: "Ministry of Manpower",  // Issuing authority
  date_created: "2023-01-01",        // When law was enacted
  tags: ["overtime", "working hours"] // Additional keywords
}
```

---

## 🔧 **Technical Implementation**

### **Adding Knowledge Programmatically**
```typescript
import { ragKnowledgeBase } from '@/lib/services/ragKnowledgeBase';

// Add knowledge
const chunkIds = await ragKnowledgeBase.addKnowledge(
  content,
  title,
  source,
  category,
  metadata
);
```

### **Searching Knowledge**
```typescript
// Search for relevant chunks
const results = await ragKnowledgeBase.searchKnowledge({
  query: "employment termination",
  category: "statute",
  practiceArea: "Employment Law",
  maxResults: 5,
  similarityThreshold: 0.7
});
```

### **Generating RAG Responses**
```typescript
// Get AI response with sources
const response = await ragKnowledgeBase.generateResponse(
  "Can I work overtime in Singapore?",
  { practiceArea: "Employment Law" }
);

console.log(response.answer);     // AI-generated answer
console.log(response.sources);    // Source documents used
console.log(response.confidence); // Confidence level (0-1)
```

---

## 📊 **Monitoring and Optimization**

### **Key Metrics to Track**
- **Response Quality**: User feedback on answers
- **Source Relevance**: How often sources are cited
- **Coverage Gaps**: Questions that return low confidence
- **Usage Patterns**: Most common practice areas

### **Improving Performance**
1. **Add More Content**: More knowledge = better answers
2. **Refine Metadata**: Better tagging improves filtering
3. **Update Regularly**: Keep legal information current
4. **Monitor Feedback**: Track which answers are helpful

---

## 🎨 **Customization Options**

### **Adjusting Search Parameters**
```typescript
// More strict matching
const strictResults = await ragKnowledgeBase.searchKnowledge({
  query: "contract termination",
  similarityThreshold: 0.8,  // Higher threshold
  maxResults: 3              // Fewer results
});

// Broader search
const broadResults = await ragKnowledgeBase.searchKnowledge({
  query: "employment issues",
  similarityThreshold: 0.6,  // Lower threshold
  maxResults: 10             // More results
});
```

### **Custom AI Prompts**
The system uses GPT-4 with specialized legal prompts:
- Emphasizes accuracy and source citation
- Includes legal disclaimers
- Structures responses clearly
- Provides practical guidance

---

## 🚨 **Troubleshooting**

### **Common Issues**

**1. No Results Found**
- Check similarity threshold (try lowering to 0.6)
- Verify content exists in the knowledge base
- Try broader search terms

**2. Low Confidence Responses**
- Add more relevant content to knowledge base
- Improve content quality and detail
- Check if question matches available knowledge

**3. Slow Performance**
- Monitor database query performance
- Consider adding more specific indexes
- Optimize chunk sizes if needed

### **Error Handling**
The system includes comprehensive error handling:
- Graceful fallbacks when search fails
- User-friendly error messages
- Automatic retry mechanisms
- Production monitoring and logging

---

## 🎯 **Next Steps**

### **Immediate Actions**
1. **Deploy the RAG system** to production
2. **Add initial knowledge base** with key Singapore laws
3. **Test with real questions** from your users
4. **Monitor performance** and user feedback

### **Future Enhancements**
- **Document Upload**: Auto-extract knowledge from PDFs
- **Bulk Import**: Import large legal databases
- **Advanced Analytics**: Track usage and effectiveness
- **Multi-language**: Support for Chinese/Malay content

---

## 📞 **Support**

If you need help with your RAG implementation:
1. Check the built-in documentation in `/dashboard/rag-knowledge`
2. Review the code in `src/lib/services/ragKnowledgeBase.ts`
3. Test with the interactive chat interface
4. Monitor logs for any errors or issues

Your RAG system is now ready to provide intelligent, source-backed legal assistance! 🚀
