import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const sql = neon(process.env.DATABASE_URL);

// Database initialization function
export async function initializeDatabase() {
  try {
    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone_number TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        display_name TEXT,
        email TEXT,
        profile_image_url TEXT,
        bio TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Published projects
    await sql`
      CREATE TABLE IF NOT EXISTS published_projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        genre TEXT,
        author_name TEXT,
        cover_image_url TEXT,
        word_count INTEGER DEFAULT 0,
        
        isbn TEXT,
        publisher TEXT,
        publication_date TIMESTAMPTZ,
        price NUMERIC(10, 2),
        language TEXT DEFAULT 'en',
        copyright_text TEXT,
        categories TEXT[],
        tags TEXT[],
        
        is_public BOOLEAN DEFAULT TRUE,
        allow_comments BOOLEAN DEFAULT TRUE,
        allow_downloads BOOLEAN DEFAULT FALSE,
        
        view_count INTEGER DEFAULT 0,
        download_count INTEGER DEFAULT 0,
        like_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        
        status TEXT DEFAULT 'published',
        
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        published_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Published items
    await sql`
      CREATE TABLE IF NOT EXISTS published_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES published_projects(id) ON DELETE CASCADE,
        parent_item_id UUID REFERENCES published_items(id) ON DELETE CASCADE,
        item_type TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        content TEXT,
        metadata JSONB,
        order_index INTEGER DEFAULT 0,
        depth_level INTEGER DEFAULT 0,
        word_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Comments
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES published_projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        is_edited BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Likes
    await sql`
      CREATE TABLE IF NOT EXISTS likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES published_projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(project_id, user_id)
      )
    `;

    // Follows
    await sql`
      CREATE TABLE IF NOT EXISTS follows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(follower_id, following_id)
      )
    `;

    // Reading history
    await sql`
      CREATE TABLE IF NOT EXISTS reading_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id UUID NOT NULL REFERENCES published_projects(id) ON DELETE CASCADE,
        last_read_item_id UUID REFERENCES published_items(id),
        progress_percentage NUMERIC(5, 2) DEFAULT 0,
        last_read_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, project_id)
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_published_projects_user ON published_projects(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_published_items_project ON published_items(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_project ON likes(project_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reading_history_user ON reading_history(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_published_projects_public ON published_projects(is_public) WHERE is_public = TRUE`;

    console.log("✅ Database initialized successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ Error initializing database:", error);
    throw error;
  }
}