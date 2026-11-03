import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  MoreVertical,
  Calendar
} from 'lucide-react';
import { motion } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const stats = [
    { label: 'Total Revenue', value: '$124,563', change: '+12.5%', isUp: true, icon: DollarSign },
    { label: 'Active Users', value: '45,231', change: '+18.2%', isUp: true, icon: Users },
    { label: 'Conversion Rate', value: '3.42%', change: '-2.1%', isUp: false, icon: TrendingUp },
    { label: 'Avg. Session', value: '12m 45s', change: '+5.4%', isUp: true, icon: BarChart3 },
  ];

  const recentTransactions = [
    { id: 1, user: 'Alex Morgan', type: 'Subscription', amount: '+$49.00', status: 'Completed', date: '2 mins ago' },
    { id: 2, user: 'Sarah Chen', type: 'API Credits', amount: '+$120.00', status: 'Completed', date: '15 mins ago' },
    { id: 3, user: 'Mike Ross', type: 'Subscription', amount: '+$49.00', status: 'Pending', date: '1 hour ago' },
    { id: 4, user: 'Julia Kent', type: 'Refund', amount: '-$29.00', status: 'Completed', date: '3 hours ago' },
  ];

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-surface backdrop-blur-sm">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-ink tracking-tight">System Analytics</h1>
            <p className="text-ink-muted mt-1">Real-time performance metrics and monitoring</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-surface border border-line rounded-xl text-ink-subtle hover:text-ink transition-all">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">Last 30 Days</span>
            </button>
            <button className="px-4 py-2 bg-accent hover:bg-accent text-accent-fg rounded-xl text-sm font-medium transition-all shadow-lg ">
              Download Report
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-6 bg-surface/50 border border-line rounded-2xl hover:border-line-strong transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-elevated rounded-lg group-hover:bg-elevated transition-all">
                  <stat.icon className="w-5 h-5 text-ink-muted" />
                </div>
                <div className={`flex items-center space-x-1 text-xs font-medium ${stat.isUp ? 'text-green-400' : 'text-red-400'}`}>
                  <span>{stat.change}</span>
                  {stat.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                </div>
              </div>
              <div>
                <p className="text-sm text-ink-muted font-medium">{stat.label}</p>
                <h3 className="text-2xl font-bold text-ink mt-1">{stat.value}</h3>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Placeholder */}
          <div className="lg:col-span-2 p-6 bg-surface/50 border border-line rounded-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-bold text-ink">Resource Allocation</h3>
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-ink-subtle">CPU</span>
                </div>
                <div className="flex items-center space-x-1.5 ml-3">
                  <div className="w-2 h-2 rounded-full bg-elevated" />
                  <span className="text-ink-subtle">RAM</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] flex items-end justify-between space-x-2">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="flex-1 flex flex-col items-center space-y-2">
                  <div className="w-full flex flex-col-reverse gap-1 h-full">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.random() * 60 + 20}%` }}
                      className="w-full bg-elevated rounded-t-sm"
                    />
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.random() * 20 + 10}%` }}
                      className="w-full bg-elevated rounded-t-sm"
                    />
                  </div>
                  <span className="text-[10px] text-ink-muted font-medium">H{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="p-6 bg-surface/50 border border-line rounded-2xl flex flex-col">
            <h3 className="text-lg font-bold text-ink mb-6">Recent Activity</h3>
            <div className="space-y-6 flex-1">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center text-xs font-bold text-ink-subtle">
                      {tx.user[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{tx.user}</p>
                      <p className="text-xs text-ink-muted">{tx.type}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink">{tx.amount}</p>
                    <p className="text-[10px] text-ink-muted mt-0.5">{tx.date}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 py-2 bg-elevated text-ink-subtle hover:text-ink rounded-xl text-xs font-medium transition-all">
              View All Transactions
            </button>
          </div>
        </div>

        {/* System Logs Table */}
        <div className="bg-surface/50 border border-line rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-line flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink">System Logs</h3>
            <button className="text-ink-muted hover:text-ink transition-all">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line/50 bg-surface/20">
                  <th className="px-6 py-4 text-xs font-bold text-ink-muted uppercase tracking-widest">Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-ink-muted uppercase tracking-widest">Module</th>
                  <th className="px-6 py-4 text-xs font-bold text-ink-muted uppercase tracking-widest">Event</th>
                  <th className="px-6 py-4 text-xs font-bold text-ink-muted uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {[
                  { time: '14:23:45', module: 'Auth Engine', event: 'New user registered', status: 'Success' },
                  { time: '14:21:12', module: 'API Gateway', event: 'Rate limit triggered', status: 'Warning' },
                  { time: '14:18:02', module: 'DB Cluster', event: 'Automatic backup', status: 'Success' },
                  { time: '14:15:29', module: 'AI Router', event: 'Model context overflow', status: 'Critical' },
                ].map((log, i) => (
                  <tr key={i} className="hover:bg-elevated/20 transition-all cursor-default">
                    <td className="px-6 py-4 text-xs font-mono text-ink-muted/70">{log.time}</td>
                    <td className="px-6 py-4 text-sm text-ink">{log.module}</td>
                    <td className="px-6 py-4 text-sm text-ink-subtle">{log.event}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        log.status === 'Success' ? 'bg-green-500/10 text-green-500' : 
                        log.status === 'Warning' ? 'bg-yellow-500/10 text-yellow-500' : 
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
