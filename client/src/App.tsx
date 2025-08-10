import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { trpc } from '@/utils/trpc';
import { FileViewer } from '@/components/FileViewer';
import type { 
  RequestUploadResponse, 
  FinalizeUploadResponse,
  FileStats 
} from '../../server/src/schema';

interface UploadState {
  isUploading: boolean;
  progress: number;
  fileName: string;
  generatedLink?: string;
  error?: string;
}

function App() {
  const [fileStats, setFileStats] = useState<FileStats>({ totalFiles: 0 });
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    fileName: ''
  });
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simple routing logic
  const currentPath = window.location.pathname;
  const isFileView = currentPath.startsWith('/f/');
  const fileSlug = isFileView ? currentPath.substring(3) : null;

  const loadFileStats = useCallback(async () => {
    try {
      const stats = await trpc.getFileStats.query();
      setFileStats(stats);
    } catch (error) {
      console.error('Failed to load file stats:', error);
    }
  }, []);

  useEffect(() => {
    loadFileStats();
  }, [loadFileStats]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processFileUpload(file);
  };

  const processFileUpload = async (file: File) => {
    // Reset previous state
    setUploadState({
      isUploading: true,
      progress: 0,
      fileName: file.name,
      error: undefined,
      generatedLink: undefined
    });

    try {
      // Step 1: Request upload URL
      setUploadState(prev => ({ ...prev, progress: 10 }));
      const uploadRequest: RequestUploadResponse = await trpc.requestUpload.mutate({
        filename: file.name,
        contentType: file.type
      });

      // Step 2: Upload directly to storage
      setUploadState(prev => ({ ...prev, progress: 30 }));
      const uploadResponse = await fetch(uploadRequest.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file to storage');
      }

      setUploadState(prev => ({ ...prev, progress: 70 }));

      // Step 3: Finalize upload
      const finalizeResponse: FinalizeUploadResponse = await trpc.finalizeUpload.mutate({
        slug: uploadRequest.slug,
        objectName: uploadRequest.objectName
      });

      // Generate full URL
      const baseUrl = window.location.origin;
      const fullLink = `${baseUrl}${finalizeResponse.linkPath}`;

      setUploadState(prev => ({ 
        ...prev, 
        progress: 100,
        isUploading: false,
        generatedLink: fullLink
      }));

      // Refresh file stats
      await loadFileStats();

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed'
      }));
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      processFileUpload(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file viewer route
  if (isFileView && fileSlug) {
    return <FileViewer slug={fileSlug} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📦 Earl Box</h1>
          <p className="text-gray-600">Simple, secure file sharing</p>
          <div className="mt-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {fileStats.totalFiles.toLocaleString()} files shared
            </Badge>
          </div>
        </div>

        {/* Upload Area */}
        <div className="max-w-2xl mx-auto">
          <Card className={`border-dashed border-2 transition-colors ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400'
          }`}>
            <CardContent 
              className="p-8"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {!uploadState.isUploading && !uploadState.generatedLink ? (
                <div 
                  className="text-center cursor-pointer"
                  onClick={triggerFileInput}
                >
                  <div className="w-16 h-16 mx-auto mb-4 text-blue-500">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    {isDragOver ? 'Drop file here!' : 'Drop files here or click to browse'}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Maximum file size: 200MB
                  </p>
                  <Button variant="outline">
                    Select File
                  </Button>
                </div>
              ) : uploadState.isUploading ? (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 text-blue-500 animate-pulse">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    Uploading {uploadState.fileName}...
                  </h3>
                  <Progress value={uploadState.progress} className="mb-4" />
                  <p className="text-gray-500 text-sm">
                    {uploadState.progress}% complete
                  </p>
                </div>
              ) : uploadState.generatedLink ? (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 text-green-500">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    ✅ Upload Complete!
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {uploadState.fileName} uploaded successfully
                  </p>
                  
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <p className="text-sm text-gray-600 mb-2">Share this link:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-left bg-white p-2 rounded border text-sm font-mono break-all">
                        {uploadState.generatedLink}
                      </code>
                      <Button 
                        size="sm"
                        onClick={() => copyToClipboard(uploadState.generatedLink!)}
                      >
                        📋 Copy
                      </Button>
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    onClick={triggerFileInput}
                  >
                    Upload Another File
                  </Button>
                </div>
              ) : null}

              {uploadState.error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    {uploadState.error}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploadState.isUploading}
        />

        {/* Copy success popup */}
        {showCopySuccess && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-in slide-in-from-bottom-2">
            ✅ Link copied to clipboard!
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t py-6 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600">
            Created by <span className="font-semibold text-blue-600">Earl Store</span>❤️
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;