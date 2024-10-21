export const dynamic = 'force-dynamic'; // static by default, unless reading the request
import { prisma } from '@/prisma/prisma';
import { MediumBlogsSdk } from '@/utils/services/MediumBlogsSdk';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const mediumBlogs = await MediumBlogsSdk.getMediumFeed(
      'https://medium.com/feed/themoondevs',
    );
    const newArticles = [];
    // console.log('mediumBlogs', mediumBlogs);
    for (const item of mediumBlogs.item) {
      const metadata = MediumBlogsSdk.getMetadata(
        item['content:encoded'] ? item['content:encoded'] : '',
      );
      item.image = metadata.imageUrl;
      item.description = metadata.description;

      const existingArticle = await prisma.article.findFirst({
        where: { articleUrl: item.link },
      });

      if (!existingArticle) {
        newArticles.push({
          title: item.title,
          image: item.image,
          content: item.description || '',
          articleUrl: item.link,
          articleType: 'medium', // or any other type you define
          author: item?.["dc:creator"],
          publishDate: new Date(item.pubDate),
          categories: item.category,
        });
      }
    }

    // Create new articles in the database
    if (newArticles.length)
      await prisma.article.createMany({
        data: newArticles,
      });

    const jsonResponse = {
      status: 'success',
      data: {
        newArticles,
        mediumBlogs,
      },
    };

    return new NextResponse(JSON.stringify(jsonResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Handle errors
    console.error('Error in GET function:', error);

    const errorResponse = {
      status: 'error',
      message: 'Internal Server Error',
    };

    return new NextResponse(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
