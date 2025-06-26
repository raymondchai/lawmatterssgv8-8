import React from 'react';
import { UploadDebug } from '@/components/debug/UploadDebug';
import ProductionDiagnostics from '@/components/debug/ProductionDiagnostics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const DebugUpload: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Upload className="h-8 w-8 text-blue-600" />
              Upload Debug & Testing
            </h1>
            <p className="text-gray-600 mt-2">
              Test and debug document upload functionality
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/debug">← Back to Debug</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard/documents">Dashboard Documents</Link>
            </Button>
          </div>
        </div>

        {/* Status Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Upload System Status
            </CardTitle>
            <CardDescription>
              Current status of upload functionality and recent fixes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  ✅ Upload Component
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  ✅ File Validation
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  ✅ Supabase Storage
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  ⚠️ Testing Required
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload Debug Component */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-500" />
              Upload Testing
            </CardTitle>
            <CardDescription>
              Test document upload functionality with detailed debugging
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadDebug />
          </CardContent>
        </Card>

        {/* Production Diagnostics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              System Diagnostics
            </CardTitle>
            <CardDescription>
              Comprehensive system health check and diagnostics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductionDiagnostics />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebugUpload;
