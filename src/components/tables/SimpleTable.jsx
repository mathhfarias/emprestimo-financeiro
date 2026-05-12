import EmptyState from '../ui/EmptyState.jsx';

export default function SimpleTable({ columns, data, emptyTitle, emptyDescription }) {
  if (!data?.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="table-th">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/70">
                {columns.map((column) => (
                  <td key={column.key} className="table-td">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
