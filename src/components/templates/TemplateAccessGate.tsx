import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useTemplateAccess, type UseTemplateAccessResult } from '@/hooks/useTemplateAccess';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/config/constants';
import { 
  Lock, 
  Crown, 
  Star, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight,
  Calendar,
  Download,
  FileText,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface TemplateAccessGateProps {
  children: React.ReactNode;
  templateAccessLevel: 'public' | 'premium' | 'enterprise';
  templateId?: string;
  className?: string;
}

export const TemplateAccessGate: React.FC<TemplateAccessGateProps> = ({
  children,
  templateAccessLevel,
  templateId,
  className = ''
}) => {
  const { user } = useAuth();
  const accessData = useTemplateAccess(templateAccessLevel, templateId);

  if (accessData.loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (accessData.canViewTemplate) {
    return (
      <div className={className}>
        {children}
        {accessData.usageStats && accessData.subscription && (
          <UsageIndicator accessData={accessData} />
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <AccessDeniedCard accessData={accessData} templateAccessLevel={templateAccessLevel} />
      {user && <UpgradePrompt accessData={accessData} />}
      {!user && <LoginPrompt />}
    </div>
  );
};

interface AccessDeniedCardProps {
  accessData: UseTemplateAccessResult;
  templateAccessLevel: 'public' | 'premium' | 'enterprise';
}

const AccessDeniedCard: React.FC<AccessDeniedCardProps> = ({ accessData, templateAccessLevel }) => {
  const getAccessLevelIcon = () => {
    switch (templateAccessLevel) {
      case 'premium':
        return <Crown className="h-8 w-8 text-yellow-500" />;
      case 'enterprise':
        return <Star className="h-8 w-8 text-purple-500" />;
      default:
        return <Lock className="h-8 w-8 text-gray-500" />;
    }
  };

  const getAccessLevelBadge = () => {
    switch (templateAccessLevel) {
      case 'premium':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Premium</Badge>;
      case 'enterprise':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800">Enterprise</Badge>;
      default:
        return <Badge variant="secondary">Public</Badge>;
    }
  };

  return (
    <Card className="border-2 border-dashed border-gray-300">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {getAccessLevelIcon()}
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          Access Restricted
          {getAccessLevelBadge()}
        </CardTitle>
        <CardDescription>
          {accessData.accessResult?.reason || 'You need a subscription to access this template'}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This template requires a {templateAccessLevel === 'enterprise' ? 'Enterprise' : 'Premium'} subscription to access.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

interface UpgradePromptProps {
  accessData: UseTemplateAccessResult;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ accessData }) => {
  const upgradeRequired = accessData.accessResult?.upgradeRequired;
  
  if (!upgradeRequired) return null;

  const getUpgradeFeatures = (tier: string) => {
    switch (tier) {
      case 'premium':
        return [
          'Access to Premium templates',
          'DOCX and HTML downloads',
          'Advanced customization options',
          'Priority support'
        ];
      case 'pro':
        return [
          'Everything in Premium',
          'Unlimited template usage',
          'Advanced AI features',
          'Team collaboration tools'
        ];
      case 'enterprise':
        return [
          'Everything in Pro',
          'Enterprise templates',
          'Custom branding',
          'Dedicated account manager',
          'SLA guarantee'
        ];
      default:
        return [];
    }
  };

  const features = getUpgradeFeatures(upgradeRequired);

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-blue-600" />
          Upgrade to {upgradeRequired.charAt(0).toUpperCase() + upgradeRequired.slice(1)}
        </CardTitle>
        <CardDescription>
          Unlock this template and many more features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
        
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link to={ROUTES.pricing}>
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={ROUTES.pricing}>
              View Plans
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const LoginPrompt: React.FC = () => {
  return (
    <Card className="border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-green-600" />
          Sign In Required
        </CardTitle>
        <CardDescription>
          Create a free account to access this template
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">Free account creation</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">Access to public templates</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">Save your customizations</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button asChild className="flex-1">
            <Link to={ROUTES.register}>
              Create Account
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={ROUTES.login}>
              Sign In
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface UsageIndicatorProps {
  accessData: UseTemplateAccessResult;
}

const UsageIndicator: React.FC<UsageIndicatorProps> = ({ accessData }) => {
  const { subscription, usageStats, accessResult } = accessData;
  
  if (!subscription || !usageStats || !accessResult?.remainingUsage) {
    return null;
  }

  // Don't show for unlimited plans
  if (accessResult.remainingUsage === -1) {
    return null;
  }

  const usagePercentage = subscription.tier === 'free' 
    ? Math.min((usageStats.templatesUsedThisMonth / 5) * 100, 100) // Assuming 5 free templates
    : Math.min((usageStats.templatesUsedThisMonth / 50) * 100, 100); // Assuming 50 for premium

  const isNearLimit = usagePercentage > 80;

  return (
    <Card className={`mt-4 ${isNearLimit ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Template Usage
          <Badge variant={isNearLimit ? "destructive" : "secondary"} className="ml-auto">
            {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>This month</span>
            <span>{usageStats.templatesUsedThisMonth} used</span>
          </div>
          <Progress value={usagePercentage} className="h-2" />
          {accessResult.remainingUsage > 0 && (
            <p className="text-xs text-gray-600">
              {accessResult.remainingUsage} templates remaining
            </p>
          )}
        </div>
        
        {accessResult.resetDate && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Calendar className="h-3 w-3" />
            Resets on {accessResult.resetDate.toLocaleDateString()}
          </div>
        )}
        
        {isNearLimit && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              You're approaching your monthly limit. Consider upgrading for unlimited access.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
