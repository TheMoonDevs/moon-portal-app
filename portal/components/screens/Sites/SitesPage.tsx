'use client';

import React, { useEffect, useState } from 'react';
import { NextPage } from 'next';
import { Site } from '@prisma/client';
import { APP_BASE_FOR_SITES, APP_BASE_URL } from '@/utils/constants/appInfo';
import { useRouter } from 'next/navigation';
import { PortalSdk } from '@/utils/services/PortalSdk';

const SitesPage: NextPage = () => {
    const [sites, setSites] = useState<Site[]>([]);
    const [newSite, setNewSite] = useState({ siteName: '', description: '', subDomain: '' });
    const [showDialog, setShowDialog] = useState(false);
    const [siteToDelete, setSiteToDelete] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchSites();
    }, []);

    const fetchSites = async () => {
        try {
            const data = await PortalSdk.getData('/api/sites', {});
            setSites(data);
        } catch (error) {
            console.error('Failed to fetch sites', error);
        }
    };

    const handleAddSite = async () => {
        try {
            const response = await PortalSdk.postData('/api/sites', newSite);
            if (response) {
                fetchSites();
                setNewSite({ siteName: '', description: '', subDomain: '' });
            }
        } catch (error) {
            console.error('Failed to add site', error);
        }
    };

    const handleDeleteSite = async () => {
        if (!siteToDelete) return;
        try {
            const response = await PortalSdk.deleteData('/api/sites', { id: siteToDelete });
            if (response) {
                fetchSites();
                setShowDialog(false);
                setSiteToDelete(null);
            }
        } catch (error) {
            console.error('Failed to delete site', error);
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">All Sites</h1>
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Site Name"
                    value={newSite.siteName}
                    onChange={(e) => setNewSite({ ...newSite, siteName: e.target.value })}
                    className="border p-2 mr-2"
                />
                <input
                    type="text"
                    placeholder="Description"
                    value={newSite.description}
                    onChange={(e) => setNewSite({ ...newSite, description: e.target.value })}
                    className="border p-2 mr-2"
                />
                <input
                    type="text"
                    placeholder="Subdomain"
                    value={newSite.subDomain}
                    onChange={(e) => setNewSite({ ...newSite, subDomain: e.target.value.replaceAll(' ', '-').replaceAll('.', '-').replaceAll('/', '-') })}
                    className="border p-2 mr-2"
                />
                <button onClick={handleAddSite} className="bg-blue-500 text-white p-2">
                    Add Site
                </button>
            </div>
            <div className="grid grid-cols-1 gap-4">
                {sites.map((site) => (
                    <div key={site.id} className="border p-4 rounded shadow">
                        <h2 className="text-xl font-semibold">{site.siteName}</h2>
                        <p>{site.description}</p>
                        <a href={`${APP_BASE_FOR_SITES}/${site.subDomain}`} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                            {APP_BASE_FOR_SITES}/{site.subDomain}
                        </a>
                        <button
                            onClick={() => {
                                router.push(`/sites/${site.id}`);
                            }}
                            className="bg-green-500 text-white p-2 mt-2"
                        >
                            Edit
                        </button>
                        <button
                            onClick={() => {
                                setSiteToDelete(site.id);
                                setShowDialog(true);
                            }}
                            className="bg-red-500 text-white p-2 mt-2"
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>

            {showDialog && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center">
                    <div className="bg-white p-6 rounded shadow">
                        <p>Are you sure you want to delete this site?</p>
                        <div className="mt-4">
                            <button onClick={handleDeleteSite} className="bg-red-500 text-white p-2 mr-2">
                                Yes, Delete
                            </button>
                            <button onClick={() => setShowDialog(false)} className="bg-gray-300 p-2">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SitesPage;
