import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download } from 'lucide-react';
import { LogEntry, UserRequest, CreditHistory } from '@/types/jukebox';

interface LogsPanelProps {
  logs: LogEntry[];
  userRequests: UserRequest[];
  creditHistory: CreditHistory[];
  exportLogs: (type: string) => void;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({
  logs,
  userRequests,
  creditHistory,
  exportLogs,
}) => {
  const cleanTitle = (title: string) => {
    return title.replace(/^\d+\.\s*/, '');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Activity Log
          </label>
          <Button
            onClick={() => exportLogs("event")}
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Export
          </Button>
        </div>
        <ScrollArea className="h-48 border rounded-md p-2 bg-white">
          {logs.map((log, index) => (
            <div key={index} className="text-xs mb-1 border-b pb-1">
              <span className="text-gray-500">
                {new Date(log.timestamp).toLocaleString()}
              </span>
              <span className="ml-2 font-semibold">[{log.type}]</span>
              <span className="ml-2">{log.description}</span>
            </div>
          ))}
        </ScrollArea>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-slate-700">
            User Requests
          </label>
          <Button
            onClick={() => exportLogs("user_requests")}
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Export
          </Button>
        </div>
        <ScrollArea className="h-48 border rounded-md p-2 bg-white">
          {userRequests.map((request, index) => (
            <div key={index} className="text-xs mb-1 border-b pb-1">
              <span className="text-gray-500">
                {new Date(request.timestamp).toLocaleString()}
              </span>
              <div className="font-semibold">
                {cleanTitle(request.title)}
              </div>
              <div className="text-gray-600">
                by {request.channelTitle}
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-slate-700">
            Credit History
          </label>
          <Button
            onClick={() => exportLogs("credit_history")}
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
          >
            <Download className="w-3 h-3" />
            Export
          </Button>
        </div>
        <ScrollArea className="h-48 border rounded-md p-2 bg-white">
          {creditHistory.map((credit, index) => (
            <div key={index} className="text-xs mb-1 border-b pb-1">
              <span className="text-gray-500">
                {new Date(credit.timestamp).toLocaleString()}
              </span>
              <span
                className={`ml-2 font-semibold ${credit.type === "ADDED" ? "text-green-600" : "text-red-600"}`}
              >
                {credit.type === "ADDED" ? "+" : "-"}
                {credit.amount}
              </span>
              <div className="text-gray-600">{credit.description}</div>
            </div>
          ))}
        </ScrollArea>
      </div>
    </div>
  );
};