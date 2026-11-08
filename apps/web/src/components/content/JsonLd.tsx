export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(new RegExp('\\u2028', 'g'), '\\u2028')
    .replace(new RegExp('\\u2029', 'g'), '\\u2029');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
