import { Landing } from '@/components/omni/landing';

export default function LandingPage() {
  return (
    <Landing
      product="CMS"
      eyebrow="Live demo · no sign-up needed"
      headline={<>Structured content, published with confidence.</>}
      sub="OMNI CMS models your content, moves it from draft to published, and keeps every page, image and redirect in order — with a copilot that asks before it changes anything."
      preview={{ src: '/omni-preview.png', alt: 'OMNI CMS overview showing publishing status, recent edits and content types' }}
      features={[
        { title: 'Schema builder', body: 'Define collections and singletons with text, rich text, media, references, dates and more.' },
        { title: 'Publishing workflow', body: 'Draft, in review, scheduled and published states, with trash, restore and bulk actions.' },
        { title: 'Media library', body: 'Folders, alt text, captions and focal points for every asset you upload.' },
        { title: 'Visual editor', body: 'Reorder and edit page sections with a live preview, then save a draft or publish.' },
        { title: 'Copilot with approval', body: 'Describe a change in plain language; the copilot proposes actions you approve or reject.' },
        { title: 'Engagement modules', body: 'Forms, contacts, email campaigns and reservations — enable only the modules you need.' },
      ]}
      steps={[
        { title: 'Log in', body: 'The demo opens a sample workspace with articles, events, FAQs and media already in place.' },
        { title: 'Edit and publish', body: 'Open an entry, change it, and watch its status and the activity log update.' },
        { title: 'Shape the model', body: 'Add a content type or field in the schema builder and start writing entries for it.' },
      ]}
    />
  );
}
