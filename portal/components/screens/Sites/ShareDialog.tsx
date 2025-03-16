import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  CalendarIcon,
  SendIcon,
  ShareIcon,
  UsersIcon,
  ArrowLeftIcon,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { JSX } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { cn } from '@/lib/utils';

type ShareStep = 'initial' | 'templates' | 'digest-frequency' | 'editor';
type DigestFrequency = 'weekly' | 'monthly';

interface Template {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
}

// Mock templates - replace with actual templates from your backend
const MOCK_TEMPLATES: Template[] = [
  {
    id: '1',
    title: 'Wedding RSVP Form',
    thumbnail: '/templates/wedding-rsvp.jpg',
    description:
      'A wedding RSVP form template used to capture guest info, attendance status, address, number...',
  },
  {
    id: '2',
    title: 'Secret Santa Form',
    thumbnail: '/templates/secret-santa.jpg',
    description:
      'A Secret Santa/gift exchange form is a questionnaire used to gather information...',
  },
  // Add more templates as needed
];

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare: (type: 'must' | 'digest' | 'selective', options?: any) => void;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  open,
  onOpenChange,
  onShare,
}): JSX.Element => {
  const [currentStep, setCurrentStep] = useState<ShareStep>('initial');
  const [selectedFrequency, setSelectedFrequency] =
    useState<DigestFrequency | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    if (selectedTemplate) {
      // This is a mock template HTML - replace with actual template content
      setHtmlContent(
        `
<!DOCTYPE html>
<html>
<head>
    <title>${selectedTemplate.title}</title>
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px; }
        .content { line-height: 1.6; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${selectedTemplate.title}</h1>
        </div>
        <div class="content">
            <!-- Add your content here -->
            <p>Your content goes here...</p>
        </div>
    </div>
</body>
</html>
      `.trim(),
      );
    }
  }, [selectedTemplate]);

  const handleBack = () => {
    if (currentStep === 'editor') {
      setCurrentStep('templates');
    } else if (currentStep === 'templates' && selectedFrequency) {
      setCurrentStep('digest-frequency');
    } else {
      setCurrentStep('initial');
      setSelectedFrequency(null);
      setSelectedTemplate(null);
      setHtmlContent('');
    }
  };

  const handleShare = () => {
    if (selectedTemplate) {
      onShare(selectedFrequency ? 'digest' : 'must', {
        templateId: selectedTemplate.id,
        frequency: selectedFrequency,
        htmlContent,
      });
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setCurrentStep('editor');
  };

  const renderTemplates = () => (
    <>
      <DialogHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-xl">Select Template</DialogTitle>
        </div>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-4 p-6">
        {MOCK_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className={`flex h-auto w-full cursor-pointer flex-col items-start rounded-md p-0 hover:bg-muted ${
              selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => handleTemplateSelect(template)}
          >
            <img
              src={template.thumbnail}
              alt={template.title}
              className="h-32 w-full rounded-t-md object-cover"
            />
            <div className="p-4">
              <h3 className="text-sm font-medium">{template.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {template.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      <DialogFooter className="border-t px-6 py-4">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleShare} disabled={!selectedTemplate}>
          Continue
        </Button>
      </DialogFooter>
    </>
  );

  const renderDigestFrequency = () => (
    <>
      <DialogHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-xl">Select Frequency</DialogTitle>
        </div>
      </DialogHeader>
      <div className="space-y-3 px-6 py-4">
        <Button
          className={`flex h-auto w-full items-center gap-4 p-4 transition-colors hover:bg-neutral-50 ${
            selectedFrequency === 'weekly' ? 'border-2 border-primary' : ''
          }`}
          variant="outline"
          onClick={() => {
            setSelectedFrequency('weekly');
            setCurrentStep('templates');
          }}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
            <CalendarIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex flex-1 flex-col items-start">
            <span className="text-base font-medium">Weekly Digest</span>
            <span className="text-sm text-muted-foreground">
              Include in the next weekly newsletter
            </span>
          </div>
        </Button>
        <Button
          className={`flex h-auto w-full items-center gap-4 p-4 transition-colors hover:bg-neutral-50 ${
            selectedFrequency === 'monthly' ? 'border-2 border-primary' : ''
          }`}
          variant="outline"
          onClick={() => {
            setSelectedFrequency('monthly');
            setCurrentStep('templates');
          }}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-50">
            <CalendarIcon className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex flex-1 flex-col items-start">
            <span className="text-base font-medium">Monthly Digest</span>
            <span className="text-sm text-muted-foreground">
              Include in the next monthly newsletter
            </span>
          </div>
        </Button>
      </div>
    </>
  );

  const renderInitialOptions = () => (
    <>
      <DialogHeader className="border-b px-6 py-4">
        <DialogTitle className="flex items-center gap-2 text-xl">
          <ShareIcon className="h-5 w-5 text-neutral-500" />
          Share Post
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-3 px-6 py-4">
        <Button
          className="flex h-auto w-full items-center gap-4 p-4 transition-colors hover:bg-neutral-50"
          variant="outline"
          onClick={() => setCurrentStep('templates')}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
            <SendIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div className="flex flex-1 flex-col items-start">
            <span className="text-base font-medium">Urgent Broadcast</span>
            <span className="text-sm text-muted-foreground">
              Send as high-priority notification to all team members
            </span>
          </div>
        </Button>
        <Button
          className="flex h-auto w-full items-center gap-4 p-4 transition-colors hover:bg-neutral-50"
          variant="outline"
          onClick={() => setCurrentStep('digest-frequency')}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-50">
            <CalendarIcon className="h-5 w-5 text-green-500" />
          </div>
          <div className="flex flex-1 flex-col items-start">
            <span className="text-base font-medium">Newsletter Digest</span>
            <span className="text-sm text-muted-foreground">
              Schedule for next weekly or monthly newsletter
            </span>
          </div>
        </Button>
        <Button
          className="flex h-auto w-full items-center gap-4 p-4 transition-colors hover:bg-neutral-50"
          variant="outline"
          onClick={() => onShare('selective')}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-50">
            <UsersIcon className="h-5 w-5 text-purple-500" />
          </div>
          <div className="flex flex-1 flex-col items-start">
            <span className="text-base font-medium">Custom Distribution</span>
            <span className="text-sm text-muted-foreground">
              Share with specific teams or individuals
            </span>
          </div>
        </Button>
      </div>
      <DialogFooter className="border-t px-6 py-4">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  );

  const renderEditor = () => (
    <div className="w-full">
      <DialogHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-8 w-8"
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-xl">Edit Template</DialogTitle>
        </div>
      </DialogHeader>
      <div className="flex gap-4 overflow-hidden p-6">
        <div className="flex w-1/2 flex-col rounded-lg border">
          <div className="border-b bg-muted px-4 py-2 text-sm font-medium">
            HTML Editor
          </div>
          <div className="h-full overflow-auto">
            <CodeMirror
              value={htmlContent}
              height="100%"
              theme={vscodeDark}
              extensions={[html()]}
              onChange={(value: string) => setHtmlContent(value)}
              className="h-full"
            />
          </div>
        </div>
        <div className="flex w-full flex-col rounded-lg border">
          <div className="border-b bg-muted px-4 py-2 text-sm font-medium">
            Preview
          </div>
          <div className="h-full w-full overflow-auto bg-white p-4">
            <iframe
              srcDoc={htmlContent}
              className="h-full w-full"
              title="Template Preview"
            />
          </div>
        </div>
      </div>
      <DialogFooter className="border-t px-6 py-4">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleShare}>Share</Button>
      </DialogFooter>
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setCurrentStep('initial');
          setSelectedFrequency(null);
          setSelectedTemplate(null);
          setHtmlContent('');
        }
        onOpenChange(open);
      }}
    >
      <DialogContent
        className={cn(
          `w-full p-0`,
          currentStep === 'editor' &&
            'max-h-[80%] max-w-[80%] overflow-y-scroll',
        )}
      >
        {currentStep === 'initial' && renderInitialOptions()}
        {currentStep === 'digest-frequency' && renderDigestFrequency()}
        {currentStep === 'templates' && renderTemplates()}
        {currentStep === 'editor' && renderEditor()}
      </DialogContent>
    </Dialog>
  );
};
