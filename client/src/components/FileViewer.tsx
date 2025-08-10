import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import type { GetFileResponse } from '../../../server/src/schema';

interface FileViewerProps {
  slug: string;
}

export function FileViewer({ slug }: FileViewerProps) {
  const [fileData, setFileData] = useState<GetFileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFile = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await trpc.getFile.query(slug);
        setFileData(response);
        
        // Redirect directly to the file URL
        window.location.href = response.url;
      } catch (err) {
        console.error('Failed to load file:', err);
        setError(err instanceof Error ? err.message : 'File not found');
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [slug]);

  const goHome = () => {
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-pulse">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Loading file...
            </h2>
            <p className="text-gray-500">
              Retrieving your file from Earl Box
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 text-red-500">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2L13.09,8.26L22,9L17,14L18.18,23L12,19.77L5.82,23L7,14L2,9L10.91,8.26L12,2Z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              File not found
            </h2>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            <Button onClick={goHome}>
              🏠 Go to Earl Box
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This should not be reached as we redirect to the file URL
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <p className="text-gray-600 mb-4">Redirecting to file...</p>
          <Button onClick={goHome}>
            🏠 Go to Earl Box
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}