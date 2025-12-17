interface SEOBottomContentProps {
  content: string;
}

const SEOBottomContent = ({ content }: SEOBottomContentProps) => {
  if (!content) return null;

  return (
    <section className="border-t bg-card/50 mt-12">
      <div className="container mx-auto px-4 py-8">
        <div 
          className="prose prose-slate dark:prose-invert max-w-none
            prose-headings:font-serif prose-headings:text-foreground
            prose-h2:text-xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-lg prose-h3:font-medium prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:mb-4
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium
            prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4
            prose-li:text-muted-foreground prose-li:my-1
            prose-strong:text-foreground prose-strong:font-semibold"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </section>
  );
};

export default SEOBottomContent;
