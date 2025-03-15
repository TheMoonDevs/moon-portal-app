import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Play, X } from 'lucide-react';
import API_DOC from './data.json';
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';

const BASE_URL =
  'https://a1n6ih708c.execute-api.ap-southeast-2.amazonaws.com/latest';

// Get unique endpoints from API_DOC
const endpoints = API_DOC.endpoints.map((endpoint) => endpoint.path);

// Type for form values
type FormValues = Record<string, string>;

interface RequestQueryParam {
  type: string;
  description?: string;
  required?: boolean;
}

interface RequestHeader {
  type: string;
  description: string;
  example: string;
}

interface ResponseData {
  data: any;
  contentType: string;
  status: number;
}

const PreviewWindow = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(
    endpoints[0],
  );
  const [showValidation, setShowValidation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ResponseData | null>(null);

  // Get available methods for the selected endpoint
  const availableMethods = API_DOC.endpoints
    .filter((endpoint) => endpoint.path === selectedEndpoint)
    .map((endpoint) => endpoint.method);

  const [selectedMethod, setSelectedMethod] = useState<string>(
    availableMethods[0],
  );

  // Update selected method when endpoint changes
  useEffect(() => {
    setSelectedMethod(availableMethods[0]);
    setShowValidation(false);
    setResponse(null);
  }, [selectedEndpoint]);

  // Get the current endpoint data
  const currentEndpoint = API_DOC.endpoints.find(
    (endpoint) =>
      endpoint.path === selectedEndpoint && endpoint.method === selectedMethod,
  );

  // Create form schema based on request parameters
  const createFormSchema = () => {
    if (!currentEndpoint) return z.object({});

    const schemaFields: Record<string, z.ZodType<any>> = {};

    // Add query parameters
    if (currentEndpoint.requestQuery) {
      Object.entries(
        currentEndpoint.requestQuery as Record<string, RequestQueryParam>,
      ).forEach(([key, value]) => {
        const isRequired = value?.required === true;
        const schema = z.string();
        schemaFields[key] = isRequired
          ? schema.min(1, { message: 'This field is required' })
          : schema.optional();
      });
    }

    // Add body parameters if it's not a GET request
    if (currentEndpoint.requestBody && selectedMethod !== 'GET') {
      Object.entries(currentEndpoint.requestBody.schema).forEach(
        ([key, value]) => {
          const isRequired = value?.required === true;
          const schema = z.string();
          schemaFields[key] = isRequired
            ? schema.min(1, { message: 'This field is required' })
            : schema.optional();
        },
      );
    }

    return z.object(schemaFields);
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(createFormSchema()),
    mode: 'onChange',
  });

  // Reset form when endpoint or method changes
  useEffect(() => {
    form.reset();
    setShowValidation(false);
    setResponse(null);
  }, [selectedEndpoint, selectedMethod, form]);

  const makeApiCall = async (data: FormValues) => {
    if (!currentEndpoint) return;

    setIsLoading(true);
    try {
      // Construct URL with query parameters
      const baseUrlWithoutPath = BASE_URL.split('/latest')[0];
      const url = new URL(`/latest${currentEndpoint.path}`, baseUrlWithoutPath);
      if (currentEndpoint.requestQuery) {
        Object.entries(data).forEach(([key, value]) => {
          if (
            currentEndpoint.requestQuery &&
            key in currentEndpoint.requestQuery
          ) {
            url.searchParams.append(key, value);
          }
        });
      }

      // Prepare request body
      const requestBody =
        currentEndpoint.requestBody && selectedMethod !== 'GET'
          ? JSON.stringify(
              Object.fromEntries(
                Object.entries(data).filter(
                  ([key]) =>
                    currentEndpoint.requestBody?.schema &&
                    key in currentEndpoint.requestBody.schema,
                ),
              ),
            )
          : undefined;

      // Convert request headers to proper format
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (currentEndpoint.requestHeaders) {
        Object.entries(
          currentEndpoint.requestHeaders as Record<string, RequestHeader>,
        ).forEach(([key, value]) => {
          headers[key] = value.example;
        });
      }

      const response = await fetch(url.toString(), {
        method: selectedMethod,
        headers,
        body: requestBody,
      });

      const contentType = response.headers.get('content-type') || '';
      let responseData;

      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else if (contentType.includes('image/')) {
        responseData = await response.blob();
      } else {
        responseData = await response.text();
      }

      setResponse({
        data: responseData,
        contentType,
        status: response.status,
      });
    } catch (error) {
      setResponse({
        data: {
          error:
            error instanceof Error ? error.message : 'Unknown error occurred',
        },
        contentType: 'application/json',
        status: 500,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrigger = () => {
    setShowValidation(true);
    form.handleSubmit(makeApiCall)();
  };

  const renderResponse = () => {
    if (!response) return null;

    const { data, contentType, status } = response;

    return (
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Response</h3>
          <span
            className={cn(
              'rounded-full px-2 py-1 text-sm',
              status >= 200 && status < 300
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800',
            )}
          >
            Status: {status}
          </span>
        </div>
        <div className="rounded-lg border p-4">
          {contentType.includes('application/json') ? (
            <pre className="whitespace-pre-wrap break-words text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          ) : contentType.includes('image/') ? (
            <img
              src={URL.createObjectURL(data)}
              alt="Response"
              className="max-w-full rounded-lg"
            />
          ) : (
            <pre className="whitespace-pre-wrap break-words text-sm">
              {String(data)}
            </pre>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex w-full items-center justify-between rounded-lg p-2">
        {/* Left Grouping */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <X className="h-5 w-5" />
          </Button>

          <Select value={selectedEndpoint} onValueChange={setSelectedEndpoint}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Endpoint" />
            </SelectTrigger>
            <SelectContent>
              {endpoints.map((endpoint) => (
                <SelectItem key={endpoint} value={endpoint}>
                  {endpoint}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Tabs
            value={selectedMethod}
            onValueChange={setSelectedMethod}
            defaultValue={availableMethods[0]}
          >
            <TabsList>
              {availableMethods.map((method) => (
                <TabsTrigger key={method} value={method}>
                  {method}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Right Grouping */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full text-sm shadow-none"
          >
            Show Doc
          </Button>
          <Button
            variant="default"
            className="flex items-center gap-1 rounded-full shadow-none"
            onClick={handleTrigger}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Trigger
          </Button>
        </div>
      </div>

      {/* Request Form or Response */}
      {currentEndpoint && !response && (
        <Form {...form}>
          <form className="space-y-4 p-4">
            {/* Query Parameters */}
            {currentEndpoint.requestQuery &&
              Object.entries(currentEndpoint.requestQuery).length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Query Parameters</h3>
                  {Object.entries(
                    currentEndpoint.requestQuery as Record<
                      string,
                      RequestQueryParam
                    >,
                  ).map(([key, value]) => {
                    const isRequired = value?.required === true;
                    return (
                      <FormField
                        key={key}
                        control={form.control}
                        name={key}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel
                              className={cn(
                                showValidation &&
                                  form.formState.errors[key] &&
                                  'text-destructive',
                              )}
                            >
                              {key}{' '}
                              {isRequired && (
                                <span className="text-destructive">*</span>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className={cn(
                                  showValidation &&
                                    form.formState.errors[key] &&
                                    'border-destructive focus-visible:ring-destructive',
                                )}
                              />
                            </FormControl>
                            {showValidation && <FormMessage />}
                          </FormItem>
                        )}
                      />
                    );
                  })}
                </div>
              )}

            {/* Request Body */}
            {currentEndpoint.requestBody && selectedMethod !== 'GET' && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Request Body</h3>
                {Object.entries(currentEndpoint.requestBody.schema).map(
                  ([key, value]) => {
                    const isRequired = value?.required === true;
                    return (
                      <FormField
                        key={key}
                        control={form.control}
                        name={key}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel
                              className={cn(
                                showValidation &&
                                  form.formState.errors[key] &&
                                  'text-destructive',
                              )}
                            >
                              {key}{' '}
                              {isRequired && (
                                <span className="text-destructive">*</span>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                className={cn(
                                  showValidation &&
                                    form.formState.errors[key] &&
                                    'border-destructive focus-visible:ring-destructive',
                                )}
                              />
                            </FormControl>
                            {showValidation && <FormMessage />}
                          </FormItem>
                        )}
                      />
                    );
                  },
                )}
              </div>
            )}
          </form>
        </Form>
      )}

      {/* Response Display */}
      {response && renderResponse()}
    </div>
  );
};

export default PreviewWindow;
