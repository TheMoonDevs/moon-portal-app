'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '@/utils/hooks/useUser';
import { PortalSdk } from '@/utils/services/PortalSdk';
import { BOTTYPE } from '@prisma/client';

interface Bot {
  id: string;
  title: string;
  description?: string;
  prUrl?: string;
  prNumber?: number;
  botStatus: string;
  botType: string;
}

interface Organization {
  id: string;
  name: string;
  githubName: string;
  githubUrl: string;
  description?: string;
  bots: Bot[];
}

const Dashboard = () => {
  const { user } = useUser();
  const clientId = user?.id;
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for creating a new organization
  const [orgName, setOrgName] = useState('');
  const [orgDescription, setOrgDescription] = useState('');

  // Form state for creating a new bot
  const [botRepo, setBotRepo] = useState('');
  const [botAppName, setBotAppName] = useState('');
  const [botAppDescription, setBotAppDescription] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [botType, setBotType] = useState<BOTTYPE>(BOTTYPE.COMMUNICATION);

  // Fetch organizations for the current client
  const fetchOrganizations = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await PortalSdk.getData(
        `/api/custom-bots/organizations?clientId=${clientId}`,
        {},
      );
      setOrganizations(data);
      // Set a default organization for the bot form if not set
      if (data.length > 0 && !selectedOrgId) {
        setSelectedOrgId(data[0].id);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchOrganizations();
    }
  }, [clientId]);

  useEffect(() => {
    if (selectedOrgId) {
      setBotRepo(
        organizations.find((org) => org.id === selectedOrgId)?.githubName || '',
      );
    }
  }, [selectedOrgId]);

  // Handle creating a new organization using POST /api/custom-bots/organizations
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !orgName) return;
    try {
      const data = await PortalSdk.postData(
        '/api/custom-bots/organizations/create',
        {
          userId: clientId,
          name: orgName,
          description: orgDescription,
        },
      );
      console.log('Created New organization:', data);
      // Refresh organizations list after creating a new one
      fetchOrganizations();
      setOrgName('');
      setOrgDescription('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle creating a new bot using POST /api/custom-bots/bots
  const handleCreateBot = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log({
      repo: botRepo,
      appName: botAppName,
      appDescription: botAppDescription,
      clientId: clientId,
      organizationId: selectedOrgId,
    });
    if (
      !clientId ||
      !selectedOrgId ||
      !botRepo ||
      !botAppName ||
      !botAppDescription
    ) {
      alert('Missing required fields');
      return;
    }
    try {
      const data = await PortalSdk.postData('/api/custom-bots/bots/create', {
        repo: botRepo,
        appName: botAppName,
        appDescription: botAppDescription,
        clientId: clientId,
        organizationId: selectedOrgId,
      });
      console.log('Created New bot:', data);
      // Refresh organizations list after creating a new bot
      fetchOrganizations();
      // Clear bot form fields
      setBotRepo('');
      setBotAppName('');
      setBotAppDescription('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="mb-6 text-3xl font-bold">Custom Bots Dashboard</h1>
      {loading && <p className="text-gray-700">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {/* Organizations Section */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">Organizations</h2>
        <form
          onSubmit={handleCreateOrganization}
          className="mb-6 rounded bg-white p-4 shadow"
        >
          <h3 className="mb-2 text-xl font-medium">Create New Organization</h3>
          <div className="mb-4">
            <label className="block text-gray-700">Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1 block w-full rounded border px-3 py-2"
              placeholder="Organization Name"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Description</label>
            <textarea
              value={orgDescription}
              onChange={(e) => setOrgDescription(e.target.value)}
              className="mt-1 block w-full rounded border px-3 py-2"
              placeholder="Organization Description"
            />
          </div>
          <button
            type="submit"
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Create Organization
          </button>
        </form>

        <div className="grid grid-cols-1 gap-4">
          {organizations.map((org) => (
            <div key={org.id} className="rounded bg-white p-4 shadow">
              <h3 className="text-xl font-semibold">{org.name}</h3>
              <p className="text-gray-600">{org.description}</p>
              <a
                href={org.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                View on GitHub
              </a>
              {org.bots && org.bots.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-lg font-medium">Bots:</h4>
                  <ul className="list-inside list-disc">
                    {org.bots.map((bot) => (
                      <li key={bot.id}>
                        <div className="font-semibold">{bot.title}</div>
                        <p>{bot.description}</p>
                        {bot.prUrl && (
                          <a
                            href={bot.prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            PR: #{bot.prNumber}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Bots Section */}
      <section className="mb-10">
        <h2 className="mb-4 text-2xl font-semibold">Create New Bot</h2>
        <form
          onSubmit={handleCreateBot}
          className="rounded bg-white p-4 shadow"
        >
          <div className="mb-4">
            <label className="block text-gray-700">Select Organization</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="mt-1 block w-full rounded border px-3 py-2"
              required
            >
              <option value="">Select Organization</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Repository</label>
            <input
              type="text"
              value={
                organizations.find((org) => org.id === selectedOrgId)?.githubUrl
              }
              className="mt-1 block w-full rounded border px-3 py-2"
              placeholder="Repository Name"
              disabled
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">App Name</label>
            <input
              type="text"
              value={botAppName}
              onChange={(e) => setBotAppName(e.target.value)}
              className="mt-1 block w-full rounded border px-3 py-2"
              placeholder="App Name"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">App Description</label>
            <textarea
              value={botAppDescription}
              onChange={(e) => setBotAppDescription(e.target.value)}
              className="mt-1 block w-full rounded border px-3 py-2"
              placeholder="App Description"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">App Type</label>
            <select
              value={botType}
              onChange={(e) => setBotType(e.target.value as BOTTYPE)}
              className="mt-1 block w-full rounded border px-3 py-2"
              required
            >
              <option value="">Select Organization</option>
              {Object.values(BOTTYPE).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            Create Bot
          </button>
        </form>
      </section>
    </div>
  );
};

export default Dashboard;
