import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { QuotaUsage } from '@/services/youtube/api';
import { ApiKeyTestResult } from '@/utils/apiKeyTester';

interface ApiManagementPanelProps {
  selectedApiKeyOption: string;
  onApiKeyOptionChange: (option: string) => void;
  customApiKey: string;
  onCustomApiKeyChange: (key: string) => void;
  apiKey: string;
  quotaUsage: QuotaUsage;
  quotaLoading: boolean;
  handleRefreshQuota: () => void;
  handleTestApiKey: () => void;
  testingApiKey: boolean;
  apiKeyTestResult: ApiKeyTestResult | null;
  autoRotateApiKeys: boolean;
  onAutoRotateChange: (enabled: boolean) => void;
  lastRotationTime: string;
  rotationHistory: Array<{
    timestamp: string;
    from: string;
    to: string;
    reason: string;
  }>;
  validApiKeys: Array<{ key: string; option: string; quotaPercentage: number }>;
  validatingKeys: boolean;
  onValidateAllKeys: () => void;
}

export const ApiManagementPanel: React.FC<ApiManagementPanelProps> = ({
  selectedApiKeyOption,
  onApiKeyOptionChange,
  customApiKey,
  onCustomApiKeyChange,
  apiKey,
  quotaUsage,
  quotaLoading,
  handleRefreshQuota,
  handleTestApiKey,
  testingApiKey,
  apiKeyTestResult,
  autoRotateApiKeys,
  onAutoRotateChange,
  lastRotationTime,
  rotationHistory,
  validApiKeys,
  validatingKeys,
  onValidateAllKeys,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          YouTube API Key
        </label>
        <div className="space-y-3">
          <Select
            value={selectedApiKeyOption}
            onValueChange={onApiKeyOptionChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an API key option" />
            </SelectTrigger>
            <SelectContent>
              {validApiKeys.map((keyInfo) => (
                <SelectItem key={keyInfo.option} value={keyInfo.option}>
                  {keyInfo.option === "key1" ? "API Key 1 (Primary)" : 
                   keyInfo.option === "key2" ? "API Key 2" :
                   keyInfo.option === "key3" ? "API Key 3" :
                   keyInfo.option === "key4" ? "API Key 4" :
                   keyInfo.option === "key5" ? "API Key 5" :
                   keyInfo.option}
                  {keyInfo.quotaPercentage !== undefined && (
                    <span className="text-xs text-slate-500 ml-2">
                      ({Math.round(keyInfo.quotaPercentage)}% used)
                    </span>
                  )}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom API Key</SelectItem>
            </SelectContent>
          </Select>

          {selectedApiKeyOption === "custom" && (
            <Input
              value={customApiKey}
              onChange={(e) => onCustomApiKeyChange(e.target.value)}
              placeholder="Enter custom YouTube API Key"
              className="font-mono text-sm"
            />
          )}

          <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">
                Quota Usage:
              </span>
              {quotaLoading ? (
                <span className="text-xs text-slate-500">
                  Checking...
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-slate-300 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        quotaUsage.percentage >= 90
                          ? "bg-red-500"
                          : quotaUsage.percentage >= 70
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                      style={{
                        width: `${Math.min(quotaUsage.percentage, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-slate-600">
                    {quotaUsage.used.toLocaleString()}/
                    {quotaUsage.limit.toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">
                    ({quotaUsage.percentage.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefreshQuota}
                size="sm"
                variant="ghost"
                className="text-xs h-6 px-2"
              >
                Refresh
              </Button>
              <Button
                onClick={handleTestApiKey}
                disabled={testingApiKey || !apiKey}
                size="sm"
                variant="outline"
                className="text-xs h-6 px-2"
              >
                {testingApiKey ? "Testing..." : "Test Key"}
              </Button>
            </div>
          </div>

          {/* Validate All Keys Button */}
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">
                Valid API Keys:
              </span>
              <span className="text-sm text-green-700 font-semibold">
                {validApiKeys.length} available
              </span>
            </div>
            <Button
              onClick={onValidateAllKeys}
              disabled={validatingKeys}
              size="sm"
              variant="outline"
              className="text-xs h-6 px-2"
            >
              {validatingKeys ? "Validating..." : "Validate & Refresh YouTube V3 Api Keys"}
            </Button>
          </div>

          {/* Individual Key Status Display */}
          {validApiKeys.length > 0 && (
            <div className="space-y-2 mt-4">
              <label className="block text-sm font-medium text-slate-700">
                Valid Keys with Available Quota:
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {validApiKeys.map((keyInfo, index) => (
                  <div
                    key={`${keyInfo.option}-${index}`}
                    className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-700">
                        {keyInfo.option.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-green-600">
                        ...{keyInfo.key.slice(-8)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-green-300 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all duration-300"
                          style={{
                            width: `${Math.min(keyInfo.quotaPercentage, 100)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-green-600 font-mono">
                        {keyInfo.quotaPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              Active Key:{" "}
              {apiKey ? `...${apiKey.slice(-8)}` : "None selected"}
              {quotaUsage.lastUpdated && (
                <span className="ml-2">
                  (Updated:{" "}
                  {new Date(quotaUsage.lastUpdated).toLocaleTimeString()})
                </span>
              )}
            </p>

            {apiKeyTestResult && (
              <div
                className={`text-xs p-2 rounded ${
                  apiKeyTestResult.isValid
                    ? apiKeyTestResult.quotaUsed
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                <span className="font-medium">
                  {apiKeyTestResult.isValid ? "✓" : "✗"} API Key Test:
                </span>{" "}
                {apiKeyTestResult.message}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg mt-4">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={autoRotateApiKeys}
              onCheckedChange={onAutoRotateChange}
              id="auto-rotate"
            />
            <label
              htmlFor="auto-rotate"
              className="text-sm font-medium text-slate-700"
            >
              Auto-rotate API keys when quota exhausted
            </label>
          </div>
          {lastRotationTime && (
            <span className="text-xs text-slate-500">
              Last rotation:{" "}
              {new Date(lastRotationTime).toLocaleTimeString()}
            </span>
          )}
        </div>

        {rotationHistory.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-700">
              Recent Rotations:
            </label>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {rotationHistory.slice(0, 3).map((rotation, index) => (
                <div
                  key={index}
                  className="text-xs text-slate-600 p-2 bg-slate-100 rounded"
                >
                  <span className="font-mono">
                    ...{rotation.from} → ...{rotation.to}
                  </span>
                  <span className="ml-2 text-slate-500">
                    {new Date(rotation.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};